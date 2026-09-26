import { Router, type IRouter } from "express";

import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.post(
  "/realtime-token",
  requireAuth,
  async (req, res): Promise<void> => {
    console.log("=================================");
    console.log("FAL REALTIME TOKEN REQUEST RECEIVED");
    console.log("=================================");

    const falKey = process.env.FAL_KEY;

    console.log(
      "FAL_KEY configured:",
      Boolean(falKey),
    );

    if (!falKey) {
      console.error(
        "FAL_KEY is missing from the server environment.",
      );

      res.status(500).json({
        error: "FAL_KEY is not configured on the server.",
      });

      return;
    }

    const { app } = req.body ?? {};

    console.log(
      "FAL app:",
      app,
    );

    if (
      typeof app !== "string" ||
      !app.trim()
    ) {
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

      /*
       * IMPORTANT:
       *
       * Use the current fal REST host.
       *
       * The old rest.alpha.fal.ai/auth/token
       * endpoint was returning 404.
       */
      const response = await fetch(
        "https://rest.fal.ai/auth/token",
        {
          method: "POST",

          headers: {
            Authorization: `Key ${falKey}`,
            "Content-Type":
              "application/json",
            Accept: "application/json",
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
            "fal realtime token request failed.",
          falStatus: response.status,
          falResponse: responseText,
        });

        return;
      }

      console.log(
        "fal token response received.",
      );

      let data: {
        token?: string;
      };

      try {
        data =
          JSON.parse(responseText) as {
            token?: string;
          };
      } catch (error) {
        console.error(
          "Unable to parse fal token response:",
          error,
        );

        res.status(502).json({
          error:
            "fal returned an invalid token response.",
        });

        return;
      }

      if (
        !data.token ||
        typeof data.token !== "string"
      ) {
        console.error(
          "fal response did not contain a token:",
          data,
        );

        res.status(502).json({
          error:
            "fal did not return a realtime token.",
        });

        return;
      }

      console.log(
        "=================================",
      );

      console.log(
        "FAL REALTIME TOKEN CREATED",
      );

      console.log(
        "Token length:",
        data.token.length,
      );

      console.log(
        "=================================",
      );

      /*
       * Never log the actual token.
       *
       * The browser receives only the short-lived
       * token. FAL_KEY remains on Render.
       */
      res
        .type("text/plain")
        .send(data.token);
    } catch (error) {
      console.error(
        "=================================",
      );

      console.error(
        "FAL REALTIME TOKEN ERROR",
      );

      console.error(
        error,
      );

      console.error(
        "=================================",
      );

      res.status(500).json({
        error:
          "Failed to connect to the fal realtime service.",
      });
    }
  },
);

export default router;
