import { eq } from "drizzle-orm";
import { db, creatorProfilesTable } from "@workspace/db";

export async function ensureCreatorProfile(userId: string) {
  const existing = await db
    .select()
    .from(creatorProfilesTable)
    .where(eq(creatorProfilesTable.clerkUserId, userId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const created = await db
    .insert(creatorProfilesTable)
    .values({ clerkUserId: userId })
    .onConflictDoNothing({
      target: creatorProfilesTable.clerkUserId,
    })
    .returning();

  if (created[0]) {
    return created[0];
  }

  const afterConflict = await db
    .select()
    .from(creatorProfilesTable)
    .where(eq(creatorProfilesTable.clerkUserId, userId))
    .limit(1);

  if (!afterConflict[0]) {
    throw new Error("Creator profile could not be created.");
  }

  return afterConflict[0];
}
