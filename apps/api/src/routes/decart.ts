import { Router, type IRouter } from "express";
import { createDecartClient } from "@decartai/sdk";

const router: IRouter = Router();

router.get(
  "/status",
  async (_req, res): Promise<void> => {
    console.log("=================================");
    console.log("DECART STATUS REQUEST RECEIVED");
    console.log("=================================");

    const decartKey =
      process.env.DECART_API_KEY;

    console.log(
      "DECART_API_KEY configured:",
      Boolean(decartKey),
    );

    if (!decartKey) {
      res.status(500).json({
        ok: false,
        provider: "decart",
        error:
          "DECART_API_KEY is not configured.",
      });

      return;
    }

    try {
      createDecartClient({
        apiKey: decartKey,
      });

      console.log(
        "DECART CLIENT INITIALIZED SUCCESSFULLY",
      );

      res.status(200).json({
        ok: true,
        provider: "decart",
        realtime: true,
      });
    } catch (error) {
      console.error(
        "DECART CLIENT INITIALIZATION ERROR:",
        error,
      );

      res.status(500).json({
        ok: false,
        provider: "decart",
        error:
          "Failed to initialize Decart.",
      });
    }
  },
);

router.post(
  "/token",
  async (_req, res): Promise<void> => {
    console.log("=================================");
    console.log(
      "DECART CLIENT TOKEN REQUEST RECEIVED",
    );
    console.log("=================================");

    const decartKey =
      process.env.DECART_API_KEY;

    console.log(
      "DECART_API_KEY configured:",
      Boolean(decartKey),
    );

    if (!decartKey) {
      console.error(
        "DECART_API_KEY is missing.",
      );

      res.status(500).json({
        error:
          "DECART_API_KEY is not configured on the server.",
      });

      return;
    }

    try {
      const client =
        createDecartClient({
          apiKey: decartKey,
        });

      console.log(
        "Creating short-lived Decart client token...",
      );

      const token =
        await client.tokens.create();

      if (
        !token ||
        typeof token.apiKey !==
          "string" ||
        !token.apiKey.trim()
      ) {
        console.error(
          "Decart returned an invalid client token.",
        );

        res.status(502).json({
          error:
            "Decart returned an invalid client token.",
        });

        return;
      }

      console.log(
        "DECART CLIENT TOKEN CREATED SUCCESSFULLY",
      );

      res.status(200).json({
        apiKey: token.apiKey,
        expiresAt:
          token.expiresAt,
      });
    } catch (error) {
      console.error(
        "DECART CLIENT TOKEN ERROR:",
        error,
      );

      res.status(502).json({
        error:
          "Failed to create Decart client token.",
      });
    }
  },
);

export default router;
