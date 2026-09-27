import { createDecartClient, models } from "@decartai/sdk";

const LUCY_MODEL = "lucy-latest";

type DecartClient = ReturnType<typeof createDecartClient>;
type DecartRealtimeClient = Awaited<
  ReturnType<DecartClient["realtime"]["connect"]>
>;

export type LucyConnection = {
  client: DecartClient | null;
  realtimeClient: DecartRealtimeClient | null;
  onResult: (result: unknown) => void;
  onError: (error: unknown) => void;
};

export type LucyMediaSession = {
  close: () => void;
  setPrompt: (prompt: string, enhancePrompt?: boolean) => void;
  setReferenceImage: (referenceImageUrl: string, prompt?: string) => void;
};

async function getDecartClientToken(): Promise<string> {
  console.log("Requesting Decart client token...");

  const response = await fetch("/api/decart/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data.error === "string"
        ? data.error
        : "Unable to create Decart client token.";
    throw new Error(message);
  }

  if (!data || typeof data.apiKey !== "string" || !data.apiKey.trim()) {
    throw new Error("Decart returned an invalid client token.");
  }

  console.log("Decart client token received.");

  return data.apiKey;
}

async function dataUrlToBase64(dataUrl: string): Promise<string> {
  const commaIndex = dataUrl.indexOf(",");

  if (commaIndex === -1) {
    throw new Error("Invalid reference image data URL.");
  }

  return dataUrl.slice(commaIndex + 1);
}

export function createLucyConnection(
  onResult: (result: unknown) => void,
  onError: (error: unknown) => void,
): LucyConnection {
  return {
    client: null,
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
  let connected = false;

  let realtimeClient: DecartRealtimeClient | null = null;

  let pendingPrompt: { text: string; enhance: boolean } | null = null;
  let pendingReference: { image: string; prompt?: string } | null = null;

  async function applyReferenceImage(
    referenceImageUrl: string,
    prompt?: string,
  ): Promise<void> {
    if (closed || !realtimeClient) {
      return;
    }

    const cleanImage = referenceImageUrl.trim();

    if (!cleanImage) {
      return;
    }

    console.log("Preparing Decart reference image...");

    let imageBase64: string;

    if (cleanImage.startsWith("data:")) {
      imageBase64 = await dataUrlToBase64(cleanImage);
    } else {
      const response = await fetch(cleanImage);

      if (!response.ok) {
        throw new Error("Unable to load the Decart reference image.");
      }

      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      let binary = "";

      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }

      imageBase64 = btoa(binary);
    }

    console.log("Sending reference image to Decart...");

    await realtimeClient.setImage(
      imageBase64,
      prompt?.trim() || undefined,
      true,
    );

    console.log("DECART REFERENCE IMAGE APPLIED");
  }

  async function connect(): Promise<void> {
    try {
      console.log("=================================");
      console.log("STARTING DECART REALTIME");
      console.log("=================================");

      const clientToken = await getDecartClientToken();

      if (closed) {
        return;
      }

      const client = createDecartClient({
        apiKey: clientToken,
      });

      connection.client = client;

      const model = models.realtime(LUCY_MODEL);

      console.log("Decart model:", LUCY_MODEL);
      console.log(
        "Decart model:",
        model.width,
        "x",
        model.height,
        "@",
        model.fps,
        "FPS",
      );

      const options: Parameters<
        DecartClient["realtime"]["connect"]
      >[1] = {
        model,
        mirror: "auto",

        onRemoteStream: (transformedStream) => {
          if (closed) {
            return;
          }

          console.log("=================================");
          console.log("DECART TRANSFORMED STREAM RECEIVED");
          console.log("=================================");

          outputVideo.srcObject = transformedStream;
          outputVideo.autoplay = true;
          outputVideo.muted = true;
          outputVideo.playsInline = true;

          void outputVideo.play().then(
            () => {
              if (!closed && !connected) {
                connected = true;
                console.log("=================================");
                console.log("AI TRANSFORMATION IS LIVE");
                console.log("=================================");
                onConnected();
              }
            },
            (error) => {
              console.error("Output video play failed:", error);

              if (!closed && !connected) {
                connected = true;
                onConnected();
              }
            },
          );
        },

        onError: (error) => {
          console.error("=================================");
          console.error("DECART REALTIME ERROR:", error);
          console.error("=================================");

          if (!closed) {
            onError(error);
          }
        },
      };

      if (pendingPrompt) {
        options.initialState = {
          prompt: {
            text: pendingPrompt.text,
            enhance: pendingPrompt.enhance,
          },
        };
      }

      console.log("Opening Decart realtime connection...");

      realtimeClient = await client.realtime.connect(inputStream, options);

      if (closed) {
        realtimeClient.disconnect();
        realtimeClient = null;
        return;
      }

      connection.realtimeClient = realtimeClient;

      console.log("=================================");
      console.log("DECART REALTIME CONNECTION OPEN");
      console.log("=================================");

      realtimeClient.on("connectionChange", (state) => {
        console.log("DECART CONNECTION STATE:", state);

        if (state === "connected" || state === "generating") {
          console.log("DECART SESSION READY");
        }
      });

      if (pendingReference) {
        const reference = pendingReference;

        try {
          await applyReferenceImage(
            reference.image,
            reference.prompt,
          );
        } catch (error) {
          console.error(
            "Decart reference image failed:",
            error,
          );

          onError(error);
        }
      }
    } catch (error) {
      console.error("=================================");
      console.error("DECART REALTIME CONNECTION FAILED:");
      console.error(error);
      console.error("=================================");

      if (!closed) {
        onError(error);
      }
    }
  }

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

    pendingPrompt = {
      text: cleanPrompt,
      enhance: enhancePrompt,
    };

    pendingReference = null;

    if (!realtimeClient) {
      console.log("Decart is connecting; prompt queued.");
      return;
    }

    void realtimeClient
      .setPrompt(cleanPrompt, enhancePrompt)
      .then(() => {
        console.log("DECART PROMPT APPLIED");
      })
      .catch((error) => {
        console.error("Decart prompt failed:", error);

        if (!closed) {
          onError(error);
        }
      });
  }

  function setReferenceImage(
    referenceImageUrl: string,
    prompt?: string,
  ): void {
    if (closed) {
      return;
    }

    const cleanImage = referenceImageUrl.trim();

    if (!cleanImage) {
      return;
    }

    pendingReference = {
      image: cleanImage,
      prompt,
    };

    pendingPrompt = null;

    if (!realtimeClient) {
      console.log("Decart is connecting; reference image queued.");
      return;
    }

    void applyReferenceImage(cleanImage, prompt).catch((error) => {
      console.error("Decart reference image failed:", error);

      if (!closed) {
        onError(error);
      }
    });
  }

  void connect();

  return {
    close: () => {
      if (closed) {
        return;
      }

      closed = true;

      console.log("Disconnecting Decart realtime...");

      try {
        realtimeClient?.disconnect();
      } catch (error) {
        console.error("Decart disconnect failed:", error);
      }

      realtimeClient = null;
      connection.realtimeClient = null;
      connection.client = null;

      if (outputVideo.srcObject) {
        outputVideo.srcObject = null;
      }

      console.log("Decart media session closed.");
    },

    setPrompt,
    setReferenceImage,
  };
}

export async function handleLucyResult(
  connection: LucyConnection,
  result: unknown,
): Promise<void> {
  console.log("Decart realtime result:", result);
  connection.onResult(result);
}
