import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post(
  "/realtime-token",
  async (req, res): Promise<void> => {
    console.log("=================================");
    console.log("FAL REALTIME TOKEN REQUEST RECEIVED");
    console.log("=================================");

    const falKey = process.env.FAL_KEY;

    console.log(
      "FAL_KEY configured:",
      Boolean(falKey),
    );

    const { app } = req.body ?? {};

    console.log(
      "FAL app:",
      app,
    );

    if (!falKey) {
      console.error(
        "FAL_KEY is missing from Render environment.",
      );

      res.status(500).json({
        error:
          "FAL_KEY is not configured on the server.",
      });

      return;
    }

    if (
      typeof app !== "string" ||
      !app.trim()
    ) {
      console.error(
        "Invalid fal app identifier.",
      );

      res.status(400).json({
        error:
          "A valid fal app identifier is required.",
      });

      return;
    }

    try {
      console.log(
        "Requesting short-lived token from fal...",
      );

      const response = await fetch(
        "https://rest.alpha.fal.ai/auth/token",
        {
          method: "POST",
          headers: {
            Authorization: `Key ${falKey}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            app: app.trim(),
          }),
        },
      );

      console.log(
        "fal token response status:",
        response.status,
      );

      const responseText =
        await response.text();

      if (!response.ok) {
        console.error(
          "fal token request failed:",
          responseText,
        );

        res.status(502).json({
          error:
            "fal rejected the realtime token request.",
        });

        return;
      }

      if (!responseText.trim()) {
        console.error(
          "fal returned an empty token.",
        );

        res.status(502).json({
          error:
            "fal returned an empty realtime token.",
        });

        return;
      }

      console.log(
        "FAL REALTIME TOKEN CREATED SUCCESSFULLY",
      );

      res
        .type("text/plain")
        .send(responseText);
    } catch (error) {
      console.error(
        "FAL TOKEN SERVER ERROR:",
        error,
      );

      res.status(500).json({
        error:
          "Failed to connect to the fal realtime service.",
      });
    }
  },
);

export default router;
