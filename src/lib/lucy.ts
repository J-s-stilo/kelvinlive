import { fal } from "@fal-ai/client";

const LUCY_MODEL = "decart/lucy-2-5/realtime";

export type LucyConnection = ReturnType<typeof fal.realtime.connect>;

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
