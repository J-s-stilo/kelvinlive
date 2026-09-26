import { Router, type IRouter } from "express";
import { createDecartClient } from "@decartai/sdk";

const router: IRouter = Router();

router.post(
  "/realtime-token",
  async (_req, res): Promise<void> => {
    console.log("=================================");
    console.log("DECART REALTIME REQUEST RECEIVED");
    console.log("=================================");

    const decartKey = process.env.DECART_API_KEY;

    console.log(
      "DECART_API_KEY configured:",
      Boolean(decartKey),
    );

    if (!decartKey) {
      console.error(
        "DECART_API_KEY is missing from Render environment.",
      );

      res.status(500).json({
        error:
          "DECART_API_KEY is not configured on the server.",
      });

      return;
    }

    try {
      const client = createDecartClient({
        apiKey: decartKey,
      });

      console.log(
        "DECART CLIENT CREATED SUCCESSFULLY",
      );

      res.status(200).json({
        ok: true,
        message: "Decart realtime client is configured.",
      });

      void client;
    } catch (error) {
      console.error(
        "DECART CLIENT ERROR:",
        error,
      );

      res.status(500).json({
        error:
          "Failed to initialize the Decart realtime client.",
      });
    }
  },
);

export default router;
