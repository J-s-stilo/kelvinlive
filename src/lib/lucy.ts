import {
  createDecartClient,
  models,
} from "@decartai/sdk";

const LUCY_MODEL = "lucy-latest";

export type LucyConnection = {
  client: ReturnType<typeof createDecartClient>;
  realtimeClient: any | null;
  onResult: (result: unknown) => void;
  onError: (error: unknown) => void;
};

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

async function getDecartClientToken(): Promise<string> {
  console.log(
    "Requesting Decart client token...",
  );

  const response = await fetch(
    "/api/decart/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
    },
  );

  const data =
    await response.json().catch(
      () => null,
    );

  if (!response.ok) {
    const message =
      data &&
      typeof data.error === "string"
        ? data.error
        : "Unable to create Decart client token.";

    throw new Error(message);
  }

  if (
    !data ||
    typeof data.apiKey !== "string" ||
    !data.apiKey.trim()
  ) {
    throw new Error(
      "Decart returned an invalid client token.",
    );
  }

  console.log(
    "Decart client token received.",
  );

  return data.apiKey;
}

async function dataUrlToBlob(
  dataUrl: string,
): Promise<Blob> {
  const response =
    await fetch(dataUrl);

  return response.blob();
}

export function createLucyConnection(
  onResult: (result: unknown) => void,
  onError: (error: unknown) => void,
): LucyConnection {
  /*
   * The permanent DECART_API_KEY stays on
   * the Render server.
   *
   * The browser receives only a short-lived
   * Decart client token.
   */
  const client =
    createDecartClient({
      apiKey: "",
    });

  return {
    client,
    realtimeClient: null,
    onResult,
    onError,
  };
}

export function createLucyMediaSession(
  connection: LucyConnection,
  inputStream: MediaStream,
  outputVideo: HTMLVideoElement,
  onConnected: () => void,
  onError: (error: unknown) => void,
): LucyMediaSession {
  let closed = false;

  let realtimeClient:
    | any
    | null = null;

  let pendingPrompt:
    | {
        text: string;
        enhance: boolean;
      }
    | null = null;

  let pendingReference:
    | {
        image: string;
        prompt?: string;
      }
    | null = null;

  async function connect(): Promise<void> {
    try {
      console.log(
        "=================================",
      );

      console.log(
        "CONNECTING TO DECART REALTIME",
      );

      console.log(
        "=================================",
      );

      const clientToken =
        await getDecartClientToken();

      if (closed) {
        return;
      }

      const client =
        createDecartClient({
          apiKey: clientToken,
        });

      const model =
        models.realtime(
          LUCY_MODEL,
        );

      console.log(
        "Decart model:",
        LUCY_MODEL,
      );

      console.log(
        "Decart model resolution:",
        model.width,
        "x",
        model.height,
      );

      console.log(
        "Decart model FPS:",
        model.fps,
      );

      realtimeClient =
        await client.realtime.connect(
          inputStream,
          {
            model,

            mirror: "auto",

            onRemoteStream:
              (
                transformedStream,
              ) => {
                if (closed) {
                  return;
                }

                console.log(
                  "=================================",
                );

                console.log(
                  "DECART TRANSFORMED STREAM RECEIVED",
                );

                console.log(
                  "=================================",
                );

                outputVideo.srcObject =
                  transformedStream;

                outputVideo.autoplay =
                  true;

                outputVideo.muted =
                  true;

                outputVideo.playsInline =
                  true;

                void outputVideo
                  .play()
                  .then(() => {
                    if (!closed) {
                      console.log(
                        "DECART TRANSFORMATION IS LIVE",
                      );

                      onConnected();
                    }
                  })
                  .catch(
                    (error) => {
                      console.error(
                        "Decart output video play failed:",
                        error,
                      );

                      if (!closed) {
                        onConnected();
                      }
                    },
                  );
              },

            onError: (
              error,
            ) => {
              console.error(
                "Decart realtime error:",
                error,
              );

              onError(error);
            },

            initialState:
              pendingReference
                ? undefined
                : pendingPrompt
                  ? {
                      prompt: {
                        text:
                          pendingPrompt
                            .text,
                        enhance:
                          pendingPrompt
                            .enhance,
                      },
                    }
                  : undefined,
          },
        );

      connection.realtimeClient =
        realtimeClient;

      console.log(
        "DECART REALTIME CONNECTED",
      );

      /*
       * Apply a prompt that was requested
       * before the connection finished.
       */
      if (
        pendingPrompt &&
        !pendingReference
      ) {
        try {
          realtimeClient.setPrompt(
            pendingPrompt.text,
          );
        } catch (error) {
          console.error(
            "Decart pending prompt failed:",
            error,
          );

          onError(error);
        }
      }

      /*
       * Apply a reference image that was
       * requested before connection finished.
       */
      if (pendingReference) {
        try {
          await applyReference(
            pendingReference.image,
            pendingReference.prompt,
          );
        } catch (error) {
          console.error(
            "Decart pending reference failed:",
            error,
          );

          onError(error);
        }
      }
    } catch (error) {
      console.error(
        "DECART REALTIME CONNECTION FAILED:",
        error,
      );

      onError(error);
    }
  }

  async function applyReference(
    referenceImageUrl: string,
    prompt?: string,
  ): Promise<void> {
    if (
      !realtimeClient ||
      closed
    ) {
      return;
    }

    const cleanImage =
      referenceImageUrl.trim();

    if (!cleanImage) {
      return;
    }

    console.log(
      "Sending reference image to Decart...",
    );

    /*
     * Studio currently gives us a data URL.
     * Convert it to a Blob so the Decart SDK
     * can send it as image input.
     */
    let image:
      | string
      | Blob =
      cleanImage;

    if (
      cleanImage.startsWith(
        "data:",
      )
    ) {
      image =
        await dataUrlToBlob(
          cleanImage,
        );
    }

    await realtimeClient.set({
      image,

      ...(prompt?.trim()
        ? {
            prompt:
              prompt.trim(),
          }
        : {}),

      enhance: true,
    });

    console.log(
      "DECART REFERENCE IMAGE APPLIED",
    );
  }

  void connect();

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
      return;
    }

    pendingPrompt = {
      text: cleanPrompt,
      enhance: enhancePrompt,
    };

    pendingReference = null;

    if (!realtimeClient) {
      console.log(
        "Decart is still connecting; prompt queued.",
      );

      return;
    }

    try {
      realtimeClient.setPrompt(
        cleanPrompt,
      );

      console.log(
        "Decart prompt sent:",
        cleanPrompt,
      );
    } catch (error) {
      console.error(
        "Decart prompt failed:",
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
      return;
    }

    pendingReference = {
      image: cleanImage,
      prompt,
    };

    pendingPrompt = null;

    if (!realtimeClient) {
      console.log(
        "Decart is still connecting; reference image queued.",
      );

      return;
    }

    void applyReference(
      cleanImage,
      prompt,
    ).catch((error) => {
      console.error(
        "Decart reference image failed:",
        error,
      );

      onError(error);
    });
  }

  return {
    close: () => {
      if (closed) {
        return;
      }

      closed = true;

      console.log(
        "Disconnecting Decart realtime...",
      );

      try {
        realtimeClient?.disconnect();
      } catch (error) {
        console.error(
          "Decart disconnect failed:",
          error,
        );
      }

      realtimeClient =
        null;

      connection.realtimeClient =
        null;

      if (
        outputVideo.srcObject
      ) {
        outputVideo.srcObject =
          null;
      }

      console.log(
        "Decart media session closed.",
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
   * Kept because Studio.tsx already imports
   * this function.
   *
   * Decart's current SDK handles realtime
   * WebRTC signaling internally, so Studio
   * does not need to manually process ICE/SDP
   * messages anymore.
   */
  console.log(
    "Decart realtime result:",
    result,
  );

  void connection;
}
