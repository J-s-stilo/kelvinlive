import { Router, type IRouter } from "express";

import {
  db,
  streamSessionsTable,
} from "@workspace/db";

import {
  GetCurrentProfileResponse,
  GetCreditsResponse,
  StartStreamSessionBody,
  StartStreamSessionResponse,
} from "@workspace/api-zod";

import { ensureCreatorProfile } from "../lib/creator";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/me", requireAuth, async (_req, res): Promise<void> => {
  const profile = await ensureCreatorProfile(res.locals.userId);

  res.json(GetCurrentProfileResponse.parse(profile));
});

router.get("/credits", requireAuth, async (_req, res): Promise<void> => {
  const profile = await ensureCreatorProfile(res.locals.userId);

  res.json(
    GetCreditsResponse.parse({
      credits: profile.credits,
    }),
  );
});

router.post(
  "/stream-sessions",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = StartStreamSessionBody.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const [session] = await db
      .insert(streamSessionsTable)
      .values({
        clerkUserId: res.locals.userId,
        status: "live",
        title: parsed.data.title ?? null,
        startedAt: new Date(),
      })
      .returning();

    res
      .status(201)
      .json(StartStreamSessionResponse.parse(session));
  },
);

export default router;
