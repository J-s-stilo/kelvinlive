import { fal } from "@fal-ai/client";

const LUCY_MODEL = "decart/lucy-2-5/realtime";

export type LucyConnection = ReturnType<
  typeof fal.realtime.connect
>;

export type LucyMediaSession = {
  close: () => void;
};

type LucyResult = {
  type?: string;
  iceServers?: RTCIceServer[];
  iceservers?: RTCIceServer[];
  ice_servers?: RTCIceServer[];

  candidate?: RTCIceCandidateInit | null;

  sdp?: string;

  error?: unknown;

  success?: boolean;
};

type LucyConnectionWithHandler =
  LucyConnection & {
    __lucySignalHandler?: (
      result: unknown,
    ) => Promise<void>;
  };

export function createLucyConnection(
  onResult: (result: unknown) => void,
  onError: (error: unknown) => void,
): LucyConnection {
  return fal.realtime.connect(
    LUCY_MODEL,
    {
      connectionKey: `virofylive-${Date.now()}`,
      throttleInterval: 0,

      onResult,
      onError,

      tokenProvider: async (app) => {
        const response = await fetch(
          "/api/fal/realtime-token",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              app,
            }),
          },
        );

        if (!response.ok) {
          const message =
            await response.text();

          throw new Error(
            message ||
              "Unable to create the Lucy realtime token.",
          );
        }

        return response.text();
      },

      tokenExpirationSeconds: 10,
    },
  );
}

export function createLucyMediaSession(
  connection: LucyConnection,
  inputStream: MediaStream,
  outputVideo: HTMLVideoElement,
  onConnected: () => void,
  onError: (error: unknown) => void,
): LucyMediaSession {
  let peerConnection:
    | RTCPeerConnection
    | null = null;

  let closed = false;

  let connectionEstablished = false;

  async function createPeerConnection(
    rawIceServers: RTCIceServer[],
  ): Promise<void> {
    if (closed) {
      return;
    }

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    peerConnection =
      new RTCPeerConnection({
        iceServers: rawIceServers.map(
          (server) => ({
            urls: server.urls,
            username:
              server.username,
            credential:
              server.credential,
          }),
        ),
      });

    for (const track of inputStream.getTracks()) {
      peerConnection.addTrack(
        track,
        inputStream,
      );
    }

    peerConnection.ontrack = (
      event,
    ) => {
      if (closed) {
        return;
      }

      const remoteStream =
        event.streams?.[0];

      if (!remoteStream) {
        return;
      }

      console.log(
        "Lucy transformed stream received.",
      );

      outputVideo.srcObject =
        remoteStream;

      outputVideo.muted = true;

      void outputVideo
        .play()
        .then(() => {
          connectionEstablished =
            true;

          onConnected();
        })
        .catch((error) => {
          console.error(
            "Lucy output video play failed:",
            error,
          );

          connectionEstablished =
            true;

          onConnected();
        });
    };

    peerConnection.onicecandidate = (
      event,
    ) => {
      if (
        closed ||
        !event.candidate
      ) {
        return;
      }

      try {
        connection.send({
          type: "icecandidate",
          candidate: {
            candidate:
              event.candidate
                .candidate,
            sdpMid:
              event.candidate
                .sdpMid,
            sdpMLineIndex:
              event.candidate
                .sdpMLineIndex,
          },
        });
      } catch (error) {
        onError(error);
      }
    };

    peerConnection.onconnectionstatechange =
      () => {
        if (
          closed ||
          !peerConnection
        ) {
          return;
        }

        console.log(
          "Lucy WebRTC state:",
          peerConnection
            .connectionState,
        );

        const state =
          peerConnection.connectionState;

        if (
          state === "failed"
        ) {
          onError(
            new Error(
              "Lucy WebRTC connection failed.",
            ),
          );
        }
      };

    peerConnection.oniceconnectionstatechange =
      () => {
        if (
          !peerConnection ||
          closed
        ) {
          return;
        }

        console.log(
          "Lucy ICE state:",
          peerConnection
            .iceConnectionState,
        );
      };

    const offer =
      await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
      offer,
    );

    if (
      !peerConnection.localDescription
    ) {
      throw new Error(
        "Lucy local WebRTC description was not created.",
      );
    }

    connection.send({
      type: "offer",
      sdp:
        peerConnection
          .localDescription
          .sdp,
    });
  }

  async function handleResult(
    rawResult: unknown,
  ): Promise<void> {
    if (closed) {
      return;
    }

    const result =
      rawResult as LucyResult;

    console.log(
      "Lucy realtime result:",
      result,
    );

    try {
      const iceServers =
        result.iceServers ??
        result.iceservers ??
        result.ice_servers;

      if (
        iceServers &&
        iceServers.length > 0
      ) {
        await createPeerConnection(
          iceServers,
        );

        return;
      }

      switch (result.type) {
        case "answer": {
          if (
            !peerConnection ||
            !result.sdp
          ) {
            return;
          }

          await peerConnection.setRemoteDescription(
            {
              type: "answer",
              sdp: result.sdp,
            },
          );

          return;
        }

        case "icecandidate": {
          if (
            !peerConnection ||
            !result.candidate
          ) {
            return;
          }

          await peerConnection.addIceCandidate(
            new RTCIceCandidate(
              result.candidate,
            ),
          );

          return;
        }

        case "generation_started": {
          console.log(
            "Lucy has started generating transformed frames.",
          );

          return;
        }

        case "prompt_ack": {
          if (
            result.success === false
          ) {
            onError(
              new Error(
                `Lucy prompt failed: ${String(
                  result.error ??
                    "unknown error",
                )}`,
              ),
            );
          }

          return;
        }

        case "set_image_ack": {
          if (
            result.success === false
          ) {
            onError(
              new Error(
                `Lucy reference image failed: ${String(
                  result.error ??
                    "unknown error",
                )}`,
              ),
            );
          }

          return;
        }

        case "error": {
          onError(
            new Error(
              `Lucy error: ${String(
                result.error ??
                  "Unknown Lucy error",
              )}`,
            ),
          );

          return;
        }

        case "ice-restart": {
          if (
            !peerConnection
          ) {
            return;
          }

          const turnConfig =
            (
              result as LucyResult & {
                turn_config?: {
                  server_url?: string;
                  username?: string;
                  credential?: string;
                };
              }
            ).turn_config;

          if (
            !turnConfig?.server_url
          ) {
            return;
          }

          peerConnection.setConfiguration(
            {
              iceServers: [
                {
                  urls:
                    "stun:stun.l.google.com:19302",
                },
                {
                  urls:
                    turnConfig.server_url,
                  username:
                    turnConfig.username,
                  credential:
                    turnConfig.credential,
                },
              ],
            },
          );

          const offer =
            await peerConnection.createOffer(
              {
                iceRestart: true,
              },
            );

          await peerConnection.setLocalDescription(
            offer,
          );

          connection.send({
            type: "offer",
            sdp: offer.sdp,
          });

          return;
        }

        default:
          return;
      }
    } catch (error) {
      console.error(
        "Lucy WebRTC processing error:",
        error,
      );

      onError(error);
    }
  }

  const connectionWithHandler =
    connection as LucyConnectionWithHandler;

  connectionWithHandler.__lucySignalHandler =
    handleResult;

  return {
    close: () => {
      closed = true;

      delete connectionWithHandler.__lucySignalHandler;

      if (peerConnection) {
        peerConnection.ontrack =
          null;

        peerConnection.onicecandidate =
          null;

        peerConnection.onconnectionstatechange =
          null;

        peerConnection.oniceconnectionstatechange =
          null;

        peerConnection.close();

        peerConnection = null;
      }

      if (
        outputVideo.srcObject
      ) {
        outputVideo.srcObject =
          null;
      }

      connectionEstablished =
        false;
    },
  };
}
