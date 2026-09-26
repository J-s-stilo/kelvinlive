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

type LucyConnectionInternal =
  LucyConnection & {
    __lucySignalHandler?: (
      result: unknown,
    ) => Promise<void>;
  };

export function createLucyConnection(
  onResult: (result: unknown) => void,
  onError: (error: unknown) => void,
): LucyConnection {
  let connection:
    | LucyConnectionInternal
    | null = null;

  connection = fal.realtime.connect(
    LUCY_MODEL,
    {
      connectionKey: `kelvinlive-${Date.now()}`,

      throttleInterval: 0,

      onResult: async (result) => {
        console.log(
          "Lucy realtime message:",
          result,
        );

        /*
         * Always expose the message to the
         * Studio as well.
         */
        try {
          onResult(result);
        } catch (error) {
          console.error(
            "Lucy onResult handler failed:",
            error,
          );
        }

        /*
         * IMPORTANT:
         *
         * Route the same fal message directly
         * into the active WebRTC media session.
         *
         * This is the missing connection in the
         * previous version.
         */
        if (
          connection?.__lucySignalHandler
        ) {
          try {
            await connection.__lucySignalHandler(
              result,
            );
          } catch (error) {
            console.error(
              "Lucy signal handler failed:",
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
       * FAL_KEY stays on the server.
       *
       * The browser receives only a short-lived
       * realtime token.
       */
      tokenProvider: async (app) => {
        console.log(
          "Requesting Lucy realtime token...",
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

        if (!response.ok) {
          const message =
            await response.text();

          console.error(
            "Lucy token request failed:",
            message,
          );

          throw new Error(
            message ||
              "Unable to create the Lucy realtime token.",
          );
        }

        const token =
          await response.text();

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
  ) as LucyConnectionInternal;

  return connection;
}

export function createLucyMediaSession(
  connection: LucyConnection,
  inputStream: MediaStream,
  outputVideo: HTMLVideoElement,
  onConnected: () => void,
  onError: (error: unknown) => void,
): LucyMediaSession {
  const internalConnection =
    connection as LucyConnectionInternal;

  let peerConnection:
    | RTCPeerConnection
    | null = null;

  let closed = false;
  let connected = false;

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
        "Lucy prompt ignored because it is empty.",
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
        "Lucy reference image ignored because it is empty.",
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
        "Sending Lucy reference image.",
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
      "Creating Lucy WebRTC connection.",
    );

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    const iceServers =
      rawIceServers.map(
        (server) => ({
          urls: server.urls,
          username:
            server.username,
          credential:
            server.credential,
        }),
      );

    peerConnection =
      new RTCPeerConnection({
        iceServers,
      });

    /*
     * Send the user's actual camera/microphone
     * tracks to Lucy.
     */
    for (const track of
      inputStream.getTracks()) {
      console.log(
        "Adding camera track to Lucy:",
        track.kind,
        track.readyState,
      );

      peerConnection.addTrack(
        track,
        inputStream,
      );
    }

    /*
     * Receive Lucy's transformed stream.
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
            "Lucy returned a track without a remote stream.",
          );

          return;
        }

        console.log(
          "=================================",
        );

        console.log(
          "LUCY TRANSFORMED VIDEO RECEIVED",
        );

        console.log(
          "=================================",
        );

        outputVideo.srcObject =
          remoteStream;

        outputVideo.muted =
          true;

        outputVideo.autoplay =
          true;

        outputVideo.playsInline =
          true;

        void outputVideo
          .play()
          .then(() => {
            if (!connected) {
              connected = true;

              console.log(
                "Lucy transformation is LIVE.",
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
             * The stream has still arrived even
             * if autoplay was blocked.
             */
            if (!connected) {
              connected = true;
              onConnected();
            }
          });
      };

    /*
     * Send our ICE candidates back to fal.
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
          console.log(
            "Sending Lucy ICE candidate.",
          );

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

    /*
     * WebRTC state.
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
              "Lucy WebRTC connected.",
            );

            onConnected();
          }
        }

        if (
          state === "failed"
        ) {
          const error =
            new Error(
              "Lucy WebRTC connection failed.",
            );

          console.error(
            error,
          );

          onError(error);
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
     * ICE state.
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
      "Lucy signal:",
      result,
    );

    try {
      /*
       * Initial ICE server configuration.
       *
       * fal may use iceServers,
       * iceservers, or ice_servers.
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
         * Remote WebRTC answer.
         */
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
            "Applying Lucy WebRTC answer.",
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
            "Applying Lucy remote ICE candidate.",
          );

          await peerConnection.addIceCandidate(
            new RTCIceCandidate(
              result.candidate,
            ),
          );

          return;
        }

        /*
         * Transformation started.
         */
        case "generation_started": {
          console.log(
            "=================================",
          );

          console.log(
            "LUCY STARTED GENERATING FRAMES",
          );

          console.log(
            "=================================",
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
            const error =
              new Error(
                `Lucy prompt failed: ${String(
                  result.error ??
                    "Unknown prompt error",
                )}`,
              );

            console.error(
              error,
            );

            onError(error);
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
            const error =
              new Error(
                `Lucy reference image failed: ${String(
                  result.error ??
                    "Unknown reference image error",
                )}`,
              );

            console.error(
              error,
            );

            onError(error);
          } else {
            console.log(
              "Lucy reference image accepted.",
            );
          }

          return;
        }

        /*
         * fal/Decart error.
         */
        case "error": {
          const error =
            new Error(
              `Lucy server error: ${String(
                result.error ??
                  "Unknown Lucy error",
              )}`,
            );

          console.error(
            "=================================",
          );

          console.error(
            "LUCY SERVER ERROR",
          );

          console.error(
            error,
          );

          console.error(
            "=================================",
          );

          onError(error);

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
        "=================================",
      );

      console.error(
        "LUCY WEBRTC PROCESSING ERROR",
      );

      console.error(
        error,
      );

      console.error(
        "=================================",
      );

      onError(error);
    }
  }

  /*
   * THIS IS THE IMPORTANT FIX.
   *
   * The realtime connection now directly knows
   * where every fal signaling message must go.
   */
  internalConnection.__lucySignalHandler =
    handleResult;

  return {
    close: () => {
      closed = true;
      connected = false;

      if (
        internalConnection
          .__lucySignalHandler ===
        handleResult
      ) {
        delete internalConnection.__lucySignalHandler;
      }

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

/*
 * Kept as a public helper so the Studio can
 * manually route a result if needed.
 */
export async function handleLucyResult(
  connection: LucyConnection,
  result: unknown,
): Promise<void> {
  const internalConnection =
    connection as LucyConnectionInternal;

  if (
    internalConnection
      .__lucySignalHandler
  ) {
    await internalConnection
      .__lucySignalHandler(result);
  } else {
    console.warn(
      "Lucy signal received but no media session is attached.",
    );
  }
}

