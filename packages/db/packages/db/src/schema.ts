import {
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const creatorProfilesTable = pgTable("creator_profiles", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  credits: integer("credits").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const streamSessionsTable = pgTable("stream_sessions", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  status: text("status").notNull(),
  title: text("title"),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
});
