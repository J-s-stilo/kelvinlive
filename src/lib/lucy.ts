import { fal } from "@fal-ai/client";

const LUCY_MODEL = "decart/lucy-2-5/realtime";

export type LucyConnection = ReturnType<
  typeof fal.realtime.connect
>;

export type LucyMediaSession = {
  close: () => void;
  setPrompt: (
    prompt: string,
    enhancePrompt?: boolean,
  ) => void;
  setReferenceImage: (
    referenceImageUrl: string,
    prompt?: string,
  ) => void;
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

export function createLucyConnection(
  onResult: (result: unknown) => void,
  onError: (error: unknown) => void,
): LucyConnection {
  return fal.realtime.connect(
    LUCY_MODEL,
    {
      connectionKey: `kelvinlive-${Date.now()}`,

      throttleInterval: 0,

      onResult: (result) => {
        console.log(
          "Lucy realtime message:",
          result,
        );

        onResult(result);
      },

      onError: (error) => {
        console.error(
          "Lucy realtime connection error:",
          error,
        );

        onError(error);
      },

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
  let connected = false;

  /*
   * Send a prompt to Lucy.
   */
  function setPrompt(
    prompt: string,
    enhancePrompt = true,
  ): void {
    if (closed) {
      return;
    }

    const cleanPrompt = prompt.trim();

    if (!cleanPrompt) {
      return;
    }

    try {
      connection.send({
        prompt: cleanPrompt,
        enhance_prompt: enhancePrompt,
      });

      console.log(
        "Lucy prompt sent:",
        cleanPrompt,
      );
    } catch (error) {
      console.error(
        "Lucy prompt send failed:",
        error,
      );

      onError(error);
    }
  }

  /*
   * Send/update the reference image.
   *
   * Lucy 2.5 accepts a reference image together
   * with the transformation prompt.
   */
  function setReferenceImage(
    referenceImageUrl: string,
    prompt?: string,
  ): void {
    if (closed) {
      return;
    }

    const cleanImage =
      referenceImageUrl.trim();

    if (!cleanImage) {
      return;
    }

    try {
      const message: Record<
        string,
        unknown
      > = {
        reference_image_url:
          cleanImage,
        enhance_prompt: true,
      };

      if (prompt?.trim()) {
        message.prompt =
          prompt.trim();
      }

      connection.send(message);

      console.log(
        "Lucy reference image sent.",
      );
    } catch (error) {
      console.error(
        "Lucy reference image send failed:",
        error,
      );

      onError(error);
    }
  }

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
        iceServers:
          rawIceServers,
      });

    /*
     * Send the real camera tracks to Lucy.
     */
    for (const track of inputStream.getTracks()) {
      peerConnection.addTrack(
        track,
        inputStream,
      );
    }

    /*
     * Receive the transformed video.
     */
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
      outputVideo.autoplay = true;
      outputVideo.playsInline = true;

      void outputVideo
        .play()
        .then(() => {
          if (!connected) {
            connected = true;

            console.log(
              "Lucy transformation connected.",
            );

            onConnected();
          }
        })
        .catch((error) => {
          console.error(
            "Lucy output video play failed:",
            error,
          );

          if (!connected) {
            connected = true;
            onConnected();
          }
        });
    };

    /*
     * Send browser ICE candidates to Lucy.
     */
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

    /*
     * Monitor WebRTC connection.
     */
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
          "Lucy WebRTC state:",
          state,
        );

        if (
          state === "connected"
        ) {
          if (!connected) {
            connected = true;
            onConnected();
          }
        }

        if (
          state === "failed"
        ) {
          onError(
            new Error(
              "Lucy WebRTC connection failed.",
            ),
          );
        }

        if (
          state === "disconnected"
        ) {
          console.warn(
            "Lucy WebRTC disconnected.",
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
          "Lucy ICE state:",
          peerConnection
            .iceConnectionState,
        );
      };

    /*
     * Create the WebRTC offer.
     */
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

    console.log(
      "Lucy WebRTC offer sent.",
    );
  }

  /*
   * Handle every message returned by fal.
   */
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
      /*
       * First WebRTC configuration.
       */
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
        /*
         * Lucy's WebRTC answer.
         */
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

          console.log(
            "Lucy remote description applied.",
          );

          return;
        }

        /*
         * Remote ICE candidate.
         */
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

        /*
         * Lucy has started producing
         * transformed video frames.
         */
        case "generation_started": {
          console.log(
            "Lucy started generating transformed frames.",
          );

          return;
        }

        /*
         * Prompt acknowledgement.
         */
        case "prompt_ack": {
          if (
            result.success === false
          ) {
            onError(
              new Error(
                `Lucy prompt failed: ${String(
                  result.error ??
                    "Unknown prompt error",
                )}`,
              ),
            );
          } else {
            console.log(
              "Lucy prompt accepted.",
            );
          }

          return;
        }

        /*
         * Reference image acknowledgement.
         */
        case "set_image_ack": {
          if (
            result.success === false
          ) {
            onError(
              new Error(
                `Lucy reference image failed: ${String(
                  result.error ??
                    "Unknown reference image error",
                )}`,
              ),
            );
          } else {
            console.log(
              "Lucy reference image accepted.",
            );
          }

          return;
        }

        /*
         * Server error.
         */
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

        /*
         * ICE restart requested.
         */
        case "ice-restart": {
          if (
            !peerConnection
          ) {
            return;
          }

          const turnConfig =
            result.turn_config;

          if (
            !turnConfig?.server_url
          ) {
            console.warn(
              "Lucy requested ICE restart but no TURN server was provided.",
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

          if (
            !peerConnection.localDescription
          ) {
            return;
          }

          connection.send({
            type: "offer",
            sdp:
              peerConnection
                .localDescription
                .sdp,
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

  /*
   * IMPORTANT:
   *
   * fal calls the onResult callback that was
   * supplied to createLucyConnection().
   *
   * The media session must receive those
   * signaling messages.
   *
   * We therefore replace the connection's
   * callback with our WebRTC handler while
   * preserving the original connection.
   */
  const connectionWithHandler =
    connection as LucyConnection & {
      __lucyOriginalOnResult?: (
        result: unknown,
      ) => void;
      __lucySignalHandler?: (
        result: unknown,
      ) => Promise<void>;
    };

  connectionWithHandler.__lucySignalHandler =
    handleResult;

  /*
   * The @fal-ai/client connection exposes
   * its callback internally. To make the
   * session robust, also install a small
   * dispatcher when available.
   *
   * Our studio will use the explicit handler
   * below if the SDK does not expose callback
   * replacement.
   */
  const originalSend =
    connection.send.bind(connection);

  connectionWithHandler.send =
    ((message: unknown) => {
      return originalSend(
        message as never,
      );
    }) as typeof connection.send;

  return {
    close: () => {
      closed = true;
      connected = false;

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

    setPrompt,

    setReferenceImage,
  };
}

/*
 * This helper is used by the Studio to route
 * fal realtime signaling into the active
 * media session.
 */
export async function handleLucyResult(
  connection: LucyConnection,
  result: unknown,
): Promise<void> {
  const connectionWithHandler =
    connection as LucyConnection & {
      __lucySignalHandler?: (
        result: unknown,
      ) => Promise<void>;
    };

  if (
    connectionWithHandler
      .__lucySignalHandler
  ) {
    await connectionWithHandler
      .__lucySignalHandler(result);
  }
}
