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

  turn_config?: {
    server_url?: string;
    username?: string;
    credential?: string;
  };
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
      connectionKey: `kelvinlive-${Date.now()}`,
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

        const body =
          await response.text();

        if (!response.ok) {
          throw new Error(
            body ||
              "Unable to create the Lucy realtime token.",
          );
        }

        return body;
      },

      tokenExpirationSeconds: 10,
    },
  );
}

/**
 * Bridge fal's onResult callback into the
 * active WebRTC media session.
 */
export async function handleLucyResult(
  connection: LucyConnection,
  result: unknown,
): Promise<void> {
  const connectionWithHandler =
    connection as LucyConnectionWithHandler;

  const handler =
    connectionWithHandler.__lucySignalHandler;

  if (!handler) {
    console.warn(
      "Lucy result received before the media session was ready:",
      result,
    );
    return;
  }

  await handler(result);
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

  async function createPeerConnection(
    rawIceServers: RTCIceServer[],
  ): Promise<void> {
    if (closed) {
      return;
    }

    peerConnection?.close();

    peerConnection =
      new RTCPeerConnection({
        iceServers: rawIceServers.map(
          (server) => ({
            urls: server.urls,
            ...(server.username
              ? {
                  username:
                    server.username,
                }
              : {}),
            ...(server.credential
              ? {
                  credential:
                    server.credential,
                }
              : {}),
          }),
        ),
      });

    console.log(
      "Lucy WebRTC peer connection created.",
    );

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
        console.warn(
          "Lucy sent a track without a remote stream.",
        );
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
          console.log(
            "Lucy transformed video is playing.",
          );

          onConnected();
        })
        .catch((error) => {
          console.error(
            "Lucy output video play failed:",
            error,
          );

          // The stream itself is connected even if
          // browser autoplay prevents immediate playback.
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
        console.error(
          "Lucy ICE candidate send failed:",
          error,
        );

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

        const state =
          peerConnection.connectionState;

        console.log(
          "Lucy WebRTC connection state:",
          state,
        );

        if (state === "failed") {
          onError(
            new Error(
              "Lucy WebRTC connection failed.",
            ),
          );
        }

        if (state === "disconnected") {
          console.warn(
            "Lucy WebRTC connection disconnected.",
          );
        }
      };

    peerConnection.oniceconnectionstatechange =
      () => {
        if (
          closed ||
          !peerConnection
        ) {
          return;
        }

        console.log(
          "Lucy ICE connection state:",
          peerConnection.iceConnectionState,
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

    console.log(
      "Sending Lucy WebRTC offer.",
    );

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
        console.log(
          "Lucy provided ICE servers.",
        );

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
            console.warn(
              "Lucy answer received before peer connection was ready.",
            );
            return;
          }

          console.log(
            "Setting Lucy remote WebRTC answer.",
          );

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
          console.log(
            "Lucy prompt acknowledgement:",
            result,
          );

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
          console.log(
            "Lucy reference image acknowledgement:",
            result,
          );

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
          const message =
            typeof result.error ===
            "string"
              ? result.error
              : JSON.stringify(
                  result.error ??
                    "Unknown Lucy error",
                );

          console.error(
            "Lucy server error:",
            message,
          );

          onError(
            new Error(
              `Lucy error: ${message}`,
            ),
          );

          return;
        }

        case "ice-restart": {
          if (!peerConnection) {
            return;
          }

          const turnConfig =
            result.turn_config;

          if (
            !turnConfig?.server_url
          ) {
            console.warn(
              "Lucy requested ICE restart without TURN configuration.",
            );
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

        default: {
          console.log(
            "Lucy message:",
            result,
          );

          return;
        }
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
    },
  };
}
