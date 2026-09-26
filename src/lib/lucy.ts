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

type SignalHandler = (
  result: unknown,
) => Promise<void>;

export function createLucyConnection(
  onResult: (result: unknown) => void,
  onError: (error: unknown) => void,
): LucyConnection {
  let signalHandler:
    | SignalHandler
    | null = null;

  const connection = fal.realtime.connect(
    LUCY_MODEL,
    {
      connectionKey:
        `kelvinlive-${Date.now()}`,

      throttleInterval: 0,

      onResult: async (result) => {
        console.log(
          "Lucy realtime result:",
          result,
        );

        /*
         * Give the Studio the raw Lucy message.
         */
        try {
          onResult(result);
        } catch (error) {
          console.error(
            "Lucy Studio result handler failed:",
            error,
          );
        }

        /*
         * Route the same message into the
         * active WebRTC session.
         */
        if (signalHandler) {
          try {
            await signalHandler(result);
          } catch (error) {
            console.error(
              "Lucy signaling handler failed:",
              error,
            );

            onError(error);
          }
        }
      },

      onError: (error) => {
        console.error(
          "Lucy realtime connection error:",
          error,
        );

        onError(error);
      },

      /*
       * FAL_KEY NEVER goes into the browser.
       *
       * The browser receives only the short-lived
       * realtime token from our backend.
       */
      tokenProvider: async (app) => {
        console.log(
          "Requesting Lucy realtime token...",
          app,
        );

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

        const token =
          await response.text();

        if (!response.ok) {
          console.error(
            "Lucy token request failed:",
            token,
          );

          throw new Error(
            token ||
              "Unable to create the Lucy realtime token.",
          );
        }

        if (!token.trim()) {
          throw new Error(
            "FAL returned an empty realtime token.",
          );
        }

        console.log(
          "Lucy realtime token received.",
        );

        return token;
      },

      tokenExpirationSeconds: 10,
    },
  );

  /*
   * Start the realtime signaling session.
   *
   * This is required by the official realtime
   * connection flow.
   */
  try {
    connection.send({});
    console.log(
      "Lucy realtime session initialized.",
    );
  } catch (error) {
    console.error(
      "Lucy realtime initialization failed:",
      error,
    );

    onError(error);
  }

  /*
   * Attach the handler privately so the media
   * session can receive every signaling message.
   */
  const internalConnection =
    connection as LucyConnection & {
      __setLucySignalHandler?: (
        handler: SignalHandler | null,
      ) => void;
    };

  internalConnection.__setLucySignalHandler =
    (handler) => {
      signalHandler = handler;
    };

  return connection;
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

  const internalConnection =
    connection as LucyConnection & {
      __setLucySignalHandler?: (
        handler: SignalHandler | null,
      ) => void;
    };

  function setPrompt(
    prompt: string,
    enhancePrompt = true,
  ): void {
    if (closed) {
      return;
    }

    const cleanPrompt =
      prompt.trim();

    if (!cleanPrompt) {
      console.warn(
        "Lucy prompt is empty.",
      );

      return;
    }

    try {
      console.log(
        "Sending Lucy prompt:",
        cleanPrompt,
      );

      connection.send({
        prompt: cleanPrompt,
        enhance_prompt:
          enhancePrompt,
      });
    } catch (error) {
      console.error(
        "Lucy prompt send failed:",
        error,
      );

      onError(error);
    }
  }

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
      console.warn(
        "Lucy reference image is empty.",
      );

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

      console.log(
        "Sending Lucy reference image:",
        cleanImage,
      );

      connection.send(message);
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

    console.log(
      "Creating Lucy WebRTC connection...",
    );

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    peerConnection =
      new RTCPeerConnection({
        iceServers:
          rawIceServers.map(
            (server) => ({
              urls: server.urls,
              username:
                server.username,
              credential:
                server.credential,
            }),
          ),
      });

    /*
     * Send camera + microphone to Lucy.
     */
    for (const track of
      inputStream.getTracks()) {
      console.log(
        "Adding input track:",
        track.kind,
        track.readyState,
      );

      peerConnection.addTrack(
        track,
        inputStream,
      );
    }

    /*
     * Receive transformed video.
     */
    peerConnection.ontrack =
      (event) => {
        if (closed) {
          return;
        }

        const remoteStream =
          event.streams?.[0];

        if (!remoteStream) {
          console.warn(
            "Lucy returned a track without a stream.",
          );

          return;
        }

        console.log(
          "================================",
        );

        console.log(
          "LUCY TRANSFORMED STREAM RECEIVED",
        );

        console.log(
          "================================",
        );

        outputVideo.srcObject =
          remoteStream;

        outputVideo.autoplay =
          true;

        outputVideo.muted =
          true;

        outputVideo.playsInline =
          true;

        void outputVideo
          .play()
          .then(() => {
            if (!connected) {
              connected = true;

              console.log(
                "LUCY TRANSFORMATION IS LIVE",
              );

              onConnected();
            }
          })
          .catch((error) => {
            console.error(
              "Lucy output video play failed:",
              error,
            );

            /*
             * The remote stream has arrived even
             * if autoplay itself was blocked.
             */
            if (!connected) {
              connected = true;
              onConnected();
            }
          });
      };

    /*
     * Send local ICE candidates to Lucy.
     */
    peerConnection.onicecandidate =
      (event) => {
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

          console.log(
            "Lucy local ICE candidate sent.",
          );
        } catch (error) {
          console.error(
            "Lucy ICE candidate send failed:",
            error,
          );

          onError(error);
        }
      };

    /*
     * WebRTC connection state.
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
          peerConnection
            .connectionState;

        console.log(
          "Lucy WebRTC state:",
          state,
        );

        if (
          state === "connected"
        ) {
          if (!connected) {
            connected = true;

            console.log(
              "Lucy WebRTC CONNECTED.",
            );

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

    /*
     * ICE connection state.
     */
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
          peerConnection
            .iceConnectionState,
        );
      };

    /*
     * Create browser WebRTC offer.
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

    console.log(
      "Sending Lucy WebRTC offer...",
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
      "Lucy signaling message:",
      result,
    );

    try {
      /*
       * Initial ICE server message.
       */
      const iceServers =
        result.iceServers ??
        result.iceservers ??
        result.ice_servers;

      if (
        iceServers &&
        iceServers.length > 0
      ) {
        console.log(
          "Lucy ICE servers received:",
          iceServers.length,
        );

        await createPeerConnection(
          iceServers,
        );

        return;
      }

      switch (result.type) {
        /*
         * Some Lucy responses identify the
         * ICE server message by type.
         */
        case "iceservers": {
          const servers =
            result.iceServers ??
            result.iceservers ??
            result.ice_servers;

          if (
            servers &&
            servers.length > 0
          ) {
            await createPeerConnection(
              servers,
            );
          }

          return;
        }

        /*
         * Remote WebRTC answer.
         */
        case "answer": {
          if (
            !peerConnection ||
            !result.sdp
          ) {
            console.warn(
              "Lucy answer received without a peer connection or SDP.",
            );

            return;
          }

          console.log(
            "Applying Lucy WebRTC answer...",
          );

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

          console.log(
            "Applying Lucy remote ICE candidate...",
          );

          await peerConnection.addIceCandidate(
            new RTCIceCandidate(
              result.candidate,
            ),
          );

          return;
        }

        /*
         * Lucy started producing frames.
         */
        case "generation_started": {
          console.log(
            "================================",
          );

          console.log(
            "LUCY STARTED GENERATING FRAMES",
          );

          console.log(
            "================================",
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
         * Server/model error.
         */
        case "error": {
          const message =
            String(
              result.error ??
                "Unknown Lucy server error",
            );

          console.error(
            "LUCY SERVER ERROR:",
            message,
          );

          onError(
            new Error(
              `Lucy server error: ${message}`,
            ),
          );

          return;
        }

        /*
         * ICE restart.
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
              "Lucy requested ICE restart without TURN configuration.",
            );

            return;
          }

          console.log(
            "Lucy requested ICE restart.",
          );

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

          console.log(
            "Lucy ICE restart offer sent.",
          );

          return;
        }

        default: {
          console.log(
            "Lucy unhandled message:",
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

  /*
   * Connect this media session to the
   * realtime connection.
   */
  internalConnection.__setLucySignalHandler?.(
    handleResult,
  );

  return {
    close: () => {
      closed = true;
      connected = false;

      /*
       * Detach the signaling handler.
       */
      internalConnection.__setLucySignalHandler?.(
        null,
      );

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

      console.log(
        "Lucy media session closed.",
      );
    },

    setPrompt,

    setReferenceImage,
  };
}

export async function handleLucyResult(
  connection: LucyConnection,
  result: unknown,
): Promise<void> {
  /*
   * Kept for compatibility with the Studio.
   *
   * The normal path is now automatic through
   * createLucyConnection().
   */
  const internalConnection =
    connection as LucyConnection & {
      __setLucySignalHandler?: (
        handler: SignalHandler | null,
      ) => void;
    };

  /*
   * There is intentionally no second dispatch
   * here. createLucyConnection() already routes
   * every fal result to the active session.
   */
  console.log(
    "Lucy manual result received:",
    result,
  );

  void internalConnection;
}
