import { fal } from "@fal-ai/client";

const LUCY_MODEL = "decart/lucy-2-5/realtime";

export type LucyConnection = ReturnType<
  typeof fal.realtime.connect
>;

export type LucyMediaSession = {
  close: () => void;
};

type LucySignalResult = {
  type?: string;
  iceServers?: RTCIceServer[];
  iceservers?: RTCIceServer[];
  ice_servers?: RTCIceServer[];
  candidate?: RTCIceCandidateInit | null;
  sdp?: string;
  error?: unknown;
};

type LucyConnectionWithHandler = LucyConnection & {
  __lucySignalHandler?: (
    result: unknown,
  ) => Promise<void>;
};

export function createLucyConnection(
  onResult: (result: unknown) => void,
  onError: (error: unknown) => void,
): LucyConnection {
  return fal.realtime.connect(LUCY_MODEL, {
    onResult,
    onError,

    tokenProvider: async (app) => {
      const response = await fetch(
        "/api/fal/realtime-token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            app,
          }),
        },
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            "Unable to create the Lucy realtime token.",
        );
      }

      return response.text();
    },

    tokenExpirationSeconds: 10,
  });
}

export function createLucyMediaSession(
  connection: LucyConnection,
  inputStream: MediaStream,
  outputVideo: HTMLVideoElement,
  onConnected: () => void,
  onError: (error: unknown) => void,
): LucyMediaSession {
  let peerConnection: RTCPeerConnection | null = null;
  let connected = false;
  let closed = false;

  const connectionWithHandler =
    connection as LucyConnectionWithHandler;

  async function createOffer(): Promise<void> {
    if (!peerConnection || closed) {
      return;
    }

    try {
      const offer =
        await peerConnection.createOffer();

      await peerConnection.setLocalDescription(
        offer,
      );

      connection.send({
        type: "offer",
        sdp: offer.sdp,
      });
    } catch (error) {
      console.error(
        "Lucy offer creation failed:",
        error,
      );

      onError(error);
    }
  }

  async function handleSignal(
    rawResult: unknown,
  ): Promise<void> {
    if (closed) {
      return;
    }

    const result =
      rawResult as LucySignalResult;

    try {
      if (result.error) {
        onError(
          new Error(
            typeof result.error === "string"
              ? result.error
              : "Lucy realtime server error.",
          ),
        );
        return;
      }

      const iceServers =
        result.iceServers ??
        result.iceservers ??
        result.ice_servers;

      if (
        result.type === "iceServers" ||
        result.type === "iceservers" ||
        iceServers
      ) {
        if (!iceServers) {
          throw new Error(
            "Lucy did not provide ICE servers.",
          );
        }

        if (peerConnection) {
          peerConnection.close();
        }

        peerConnection =
          new RTCPeerConnection({
            iceServers,
          });

        peerConnection.ontrack = (
          event,
        ) => {
          const remoteStream =
            event.streams?.[0];

          if (!remoteStream) {
            return;
          }

          outputVideo.srcObject =
            remoteStream;

          void outputVideo
            .play()
            .then(() => {
              if (!connected) {
                connected = true;
                onConnected();
              }
            })
            .catch((error) => {
              console.error(
                "Lucy output video play error:",
                error,
              );

              if (!connected) {
                connected = true;
                onConnected();
              }
            });
        };

        peerConnection.onicecandidate = (
          event,
        ) => {
          if (!event.candidate) {
            return;
          }

          connection.send({
            type: "icecandidate",
            candidate: {
              candidate:
                event.candidate.candidate,
              sdpMid:
                event.candidate.sdpMid,
              sdpMLineIndex:
                event.candidate.sdpMLineIndex,
            },
          });
        };

        peerConnection.onconnectionstatechange =
          () => {
            if (!peerConnection) {
              return;
            }

            const state =
              peerConnection.connectionState;

            if (state === "failed") {
              onError(
                new Error(
                  "Lucy WebRTC connection failed.",
                ),
              );
            }

            if (state === "closed") {
              return;
            }
          };

        for (const track of
          inputStream.getTracks()) {
          peerConnection.addTrack(
            track,
            inputStream,
          );
        }

        await createOffer();

        return;
      }

      if (
        result.type === "answer" &&
        result.sdp &&
        peerConnection
      ) {
        await peerConnection.setRemoteDescription(
          {
            type: "answer",
            sdp: result.sdp,
          },
        );

        return;
      }

      if (
        result.type === "icecandidate" &&
        result.candidate &&
        peerConnection
      ) {
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(
            result.candidate,
          ),
        );

        return;
      }

      if (
        result.type === "ice-restart" &&
        peerConnection
      ) {
        const turnConfig =
          (
            result as LucySignalResult & {
              turn_config?: {
                server_url?: string;
                username?: string;
                credential?: string;
              };
            }
          ).turn_config;

        if (turnConfig?.server_url) {
          peerConnection.setConfiguration({
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
          });
        }

        await createOffer();

        return;
      }

      if (
        result.type === "error"
      ) {
        onError(
          new Error(
            typeof result.error === "string"
              ? result.error
              : "Lucy realtime error.",
          ),
        );

        return;
      }

      if (
        result.type === "generation_started"
      ) {
        console.log(
          "Lucy is producing transformed frames.",
        );
      }

      if (
        result.type === "prompt_ack"
      ) {
        const ack =
          result as LucySignalResult & {
            success?: boolean;
          };

        if (ack.success === false) {
          onError(
            new Error(
              "Lucy rejected the prompt.",
            ),
          );
        }
      }
    } catch (error) {
      console.error(
        "Lucy WebRTC signaling error:",
        error,
      );

      onError(error);
    }
  }

  connectionWithHandler.__lucySignalHandler =
    handleSignal;

  return {
    close: () => {
      closed = true;

      delete connectionWithHandler.__lucySignalHandler;

      if (peerConnection) {
        peerConnection.ontrack = null;
        peerConnection.onicecandidate =
          null;
        peerConnection.onconnectionstatechange =
          null;

        peerConnection.close();
        peerConnection = null;
      }

      outputVideo.srcObject = null;

      try {
        connection.close();
      } catch {
        // Ignore close errors.
      }
    },
  };
}
