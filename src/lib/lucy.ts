import { fal } from "@fal-ai/client";

const LUCY_MODEL = "decart/lucy-2-5/realtime";

export type LucyConnection = ReturnType<typeof fal.realtime.connect>;

type LucySignalResult = {
  type?: string;
  sdp?: string;
  candidate?: {
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
  };
  iceServers?: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
  iceservers?: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
  ice_servers?: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
  turn_config?: {
    server_url: string;
    username: string;
    credential: string;
  };
  success?: boolean;
  error?: string;
};

export type LucyMediaSession = {
  peerConnection: RTCPeerConnection;
  close: () => void;
};

export function createLucyConnection(
  onResult: (result: unknown) => void,
  onError: (error: unknown) => void,
) {
  return fal.realtime.connect(LUCY_MODEL, {
    onResult,
    onError,

    tokenProvider: async (app) => {
      const response = await fetch("/api/fal/realtime-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app,
        }),
      });

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || "Unable to create the Lucy realtime token.",
        );
      }

      return response.text();
    },

    tokenExpirationSeconds: 10,
  });
}

export function attachLucyMedia(
  connection: LucyConnection,
  inputStream: MediaStream,
  outputVideo: HTMLVideoElement,
  onConnected?: () => void,
  onError?: (error: unknown) => void,
): LucyMediaSession {
  let peerConnection: RTCPeerConnection | null = null;
  let closed = false;

  const send = connection.send.bind(connection);

  const handleResult = async (rawResult: unknown) => {
    if (closed || !rawResult || typeof rawResult !== "object") {
      return;
    }

    const result = rawResult as LucySignalResult;

    try {
      switch (result.type) {
        case "iceservers":
        case "iceServers":
        case "ice_servers": {
          const rawServers =
            result.iceServers ??
            result.iceservers ??
            result.ice_servers ??
            [];

          const iceServers = rawServers.map((server) => ({
            urls: server.urls,
            ...(server.username
              ? { username: server.username }
              : {}),
            ...(server.credential
              ? { credential: server.credential }
              : {}),
          }));

          peerConnection = new RTCPeerConnection({
            iceServers,
          });

          inputStream.getTracks().forEach((track) => {
            peerConnection?.addTrack(track, inputStream);
          });

          peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams;

            if (remoteStream) {
              outputVideo.srcObject = remoteStream;
              outputVideo.muted = true;
              outputVideo.playsInline = true;

              void outputVideo.play().catch(() => {
                // Browser autoplay policies may require user interaction.
              });

              onConnected?.();
            }
          };

          peerConnection.onicecandidate = (event) => {
            if (!event.candidate) {
              return;
            }

            send({
              type: "icecandidate",
              candidate: {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
              },
            });
          };

          peerConnection.onconnectionstatechange = () => {
            if (!peerConnection) {
              return;
            }

            if (
              peerConnection.connectionState === "failed" ||
              peerConnection.connectionState === "closed"
            ) {
              onError?.(
                new Error(
                  `Lucy WebRTC connection ${peerConnection.connectionState}.`,
                ),
              );
            }
          };

          const offer = await peerConnection.createOffer();

          await peerConnection.setLocalDescription(offer);

          send({
            type: "offer",
            sdp: offer.sdp,
          });

          break;
        }

        case "answer": {
          if (!peerConnection || !result.sdp) {
            return;
          }

          await peerConnection.setRemoteDescription({
            type: "answer",
            sdp: result.sdp,
          });

          break;
        }

        case "icecandidate": {
          if (!peerConnection || !result.candidate) {
            return;
          }

          await peerConnection.addIceCandidate(
            new RTCIceCandidate(result.candidate),
          );

          break;
        }

        case "ice-restart": {
          if (!peerConnection || !result.turn_config) {
            return;
          }

          peerConnection.setConfiguration({
            iceServers: [
              {
                urls: "stun:stun.l.google.com:19302",
              },
              {
                urls: result.turn_config.server_url,
                username: result.turn_config.username,
                credential: result.turn_config.credential,
              },
            ],
          });

          const offer = await peerConnection.createOffer({
            iceRestart: true,
          });

          await peerConnection.setLocalDescription(offer);

          send({
            type: "offer",
            sdp: offer.sdp,
          });

          break;
        }

        case "error": {
          onError?.(
            new Error(
              result.error || "Lucy returned a realtime error.",
            ),
          );

          break;
        }

        default:
          break;
      }
    } catch (error) {
      onError?.(error);
    }
  };

  const originalConnection = connection as LucyConnection & {
    __kelvinLucyMediaHandler?: (result: unknown) => Promise<void>;
  };

  originalConnection.__kelvinLucyMediaHandler = handleResult;

  return {
    get peerConnection() {
      if (!peerConnection) {
        throw new Error(
          "Lucy WebRTC peer connection has not been created yet.",
        );
      }

      return peerConnection;
    },

    close: () => {
      closed = true;

      if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
      }

      outputVideo.srcObject = null;
    },
  };
}
