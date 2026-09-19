import { Router, type IRouter } from "express";

import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.post(
  "/realtime-token",
  requireAuth,
  async (req, res): Promise<void> => {
    const falKey = process.env.FAL_KEY;

    if (!falKey) {
      res.status(500).json({
        error: "FAL_KEY is not configured on the server.",
      });
      return;
    }

    const { app } = req.body ?? {};

    if (typeof app !== "string" || !app.trim()) {
      res.status(400).json({
        error: "A valid fal app identifier is required.",
      });
      return;
    }

    try {
      const response = await fetch(
        "https://rest.alpha.fal.ai/auth/token",
        {
          method: "POST",
          headers: {
            Authorization: `Key ${falKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            app,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();

        res.status(502).json({
          error: "Unable to create the fal realtime token.",
          details: errorText,
        });
        return;
      }

      const data = await response.json();

      if (!data.token) {
        res.status(502).json({
          error: "fal did not return a realtime token.",
        });
        return;
      }

      res.type("text/plain").send(data.token);
    } catch (error) {
      console.error("fal realtime token error:", error);

      res.status(500).json({
        error: "Failed to connect to the fal realtime service.",
      });
    }
  },
);

export default router;
