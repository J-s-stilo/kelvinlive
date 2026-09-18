import { z } from "zod";

export const GetCurrentProfileResponse = z.object({
  clerkUserId: z.string(),
  credits: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const GetCreditsResponse = z.object({
  credits: z.number(),
});

export const StartStreamSessionBody = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export const StartStreamSessionResponse = z.object({
  id: z.string(),
  clerkUserId: z.string(),
  status: z.string(),
  title: z.string().nullable(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
});

export type GetCurrentProfileResponse = z.infer<
  typeof GetCurrentProfileResponse
>;

export type GetCreditsResponse = z.infer<typeof GetCreditsResponse>;

export type StartStreamSessionBody = z.infer<
  typeof StartStreamSessionBody
>;

export type StartStreamSessionResponse = z.infer<
  typeof StartStreamSessionResponse
>;
