import { eq } from "drizzle-orm";

import {
  creatorProfilesTable,
  db,
} from "@workspace/db";

export async function ensureCreatorProfile(clerkUserId: string) {
  const existing = await db
    .select()
    .from(creatorProfilesTable)
    .where(eq(creatorProfilesTable.clerkUserId, clerkUserId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const [profile] = await db
    .insert(creatorProfilesTable)
    .values({
      clerkUserId,
      credits: 0,
    })
    .returning();

  return profile;
}
