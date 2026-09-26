import { Router, type IRouter } from "express";
import { createDecartClient } from "@decartai/sdk";

const router: IRouter = Router();

router.get(
  "/status",
  async (_req, res): Promise<void> => {
    console.log("=================================");
    console.log("DECART STATUS REQUEST RECEIVED");
    console.log("=================================");

    const decartKey = process.env.DECART_API_KEY;

    console.log(
      "DECART_API_KEY configured:",
      Boolean(decartKey),
    );

    if (!decartKey) {
      res.status(500).json({
        ok: false,
        provider: "decart",
        error: "DECART_API_KEY is not configured.",
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
        error: "Failed to initialize Decart.",
      });
    }
  },
);

export default router;
