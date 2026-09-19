import { Router, type IRouter } from "express";

import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.post("/transform", requireAuth, async (req, res): Promise<void> => {
  const { image, prompt } = req.body ?? {};

  if (!image || typeof image !== "string") {
    res.status(400).json({
      error: "An image is required.",
    });
    return;
  }

  if (image.length > 15_000_000) {
    res.status(413).json({
      error: "Image is too large.",
    });
    return;
  }

  const cleanPrompt =
    typeof prompt === "string" && prompt.trim()
      ? prompt.trim()
      : "Transform this creator into a cinematic AI avatar while preserving the person's identity and composition.";

  res.status(501).json({
    error: "AI provider not connected yet.",
    prompt: cleanPrompt,
    nextStep: "Connect the production AI transformation provider.",
  });
});

export default router;
