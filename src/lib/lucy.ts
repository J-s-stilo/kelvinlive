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
  candidate?: RTCIceCandidateInit | null;
  sdp?: string;
  answer?: string;
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
  let closed = false;

  const connectionWithHandler =
    connection as LucyConnectionWithHandler;

  async function handleSignal(
    rawResult: unknown,
  ): Promise<void> {
    if (closed) {
      return;
    }

    const result = rawResult as LucySignalResult;

    try {
      const iceServers =
        result.iceServers ??
        result.iceservers;

      if (iceServers) {
        if (peerConnection) {
          peerConnection.close();
        }

        peerConnection = new RTCPeerConnection({
          iceServers,
        });

        peerConnection.ontrack = (event) => {
          const [remoteStream] =
            event.streams;

          if (!remoteStream) {
            return;
          }

          outputVideo.srcObject =
            remoteStream;

          void outputVideo
            .play()
            .then(() => {
              onConnected();
            })
            .catch((error) => {
              console.error(
                "Lucy output video play error:",
                error,
              );

              onConnected();
            });
        };

        peerConnection.onicecandidate = (
          event,
        ) => {
          if (!event.candidate) {
            return;
          }

          try {
            connection.send({
              candidate:
                event.candidate.toJSON(),
            });
          } catch (error) {
            onError(error);
          }
        };

        peerConnection.onconnectionstatechange =
          () => {
            if (!peerConnection) {
              return;
            }

            const state =
              peerConnection.connectionState;

            if (
              state === "failed" ||
              state === "closed"
            ) {
              onError(
                new Error(
                  `Lucy WebRTC connection ${state}.`,
                ),
              );
            }
          };

        for (const track of inputStream.getTracks()) {
          peerConnection.addTrack(
            track,
            inputStream,
          );
        }

        return;
      }

      if (result.candidate) {
        if (!peerConnection) {
          return;
        }

        await peerConnection.addIceCandidate(
          result.candidate,
        );

        return;
      }

      const answerSdp =
        result.sdp ?? result.answer;

      if (
        answerSdp &&
        peerConnection &&
        !peerConnection.currentRemoteDescription
      ) {
        await peerConnection.setRemoteDescription(
          {
            type: "answer",
            sdp: answerSdp,
          },
        );

        return;
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
        peerConnection.onicecandidate = null;
        peerConnection.onconnectionstatechange =
          null;

        peerConnection.close();
        peerConnection = null;
      }

      outputVideo.srcObject = null;
    },
  };
}
