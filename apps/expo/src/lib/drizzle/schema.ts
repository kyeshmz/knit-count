import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ============================================================================
// KNITTING APP SCHEMA - Shared between Expo (SQLite) and Cloudflare (D1)
// ============================================================================

// Projects - Top-level knitting projects
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  selectedSize: text("selected_size").notNull(), // "small", "medium", "large"
  pdfUrl: text("pdf_url"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  isArchived: integer("is_archived", { mode: "boolean" })
    .notNull()
    .default(false),
  notes: text("notes"),
  totalTimeSeconds: integer("total_time_seconds").notNull().default(0),
});

// Patterns - Reusable pattern templates
export const patterns = sqliteTable("patterns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

// Pattern Blocks - Instruction blocks within a pattern
export const patternBlocks = sqliteTable("pattern_blocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patternId: integer("pattern_id")
    .notNull()
    .references(() => patterns.id, { onDelete: "cascade" }),
  blockOrder: integer("block_order").notNull(),
  name: text("name").notNull(),
  description: text("description"),
});

// Pattern Rows - Individual row instructions within blocks
export const patternRows = sqliteTable("pattern_rows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  blockId: integer("block_id")
    .notNull()
    .references(() => patternBlocks.id, { onDelete: "cascade" }),
  rowNumber: integer("row_number").notNull(),
  side: text("side").notNull(), // "WS" or "RS"
  instruction: text("instruction").notNull(),
  stitchChangeType: text("stitch_change_type").notNull().default("none"), // "increase", "decrease", or "none"
  hasSpecialAction: integer("has_special_action", { mode: "boolean" })
    .notNull()
    .default(false),
  specialActionNote: text("special_action_note"),
  stitchChangeAmount: integer("stitch_change_amount").default(0),
});

// Pattern Repeats - Defines repeat logic for blocks/rows
export const patternRepeats = sqliteTable("pattern_repeats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  blockId: integer("block_id")
    .notNull()
    .references(() => patternBlocks.id, { onDelete: "cascade" }),
  repeatType: text("repeat_type").notNull(), // "none", "block", or "rows"
  startRowNumber: integer("start_row_number"),
  endRowNumber: integer("end_row_number"),
  timesToRepeat: integer("times_to_repeat").notNull(),
  sizeVariations: text("size_variations"), // JSON: {"small": 1, "medium": 2, "large": 3}
});

// Project Progress - Tracks current state of a project
export const projectProgress = sqliteTable("project_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  patternId: integer("pattern_id")
    .notNull()
    .references(() => patterns.id),
  currentBlockId: integer("current_block_id").references(
    () => patternBlocks.id,
  ),
  currentRowNumber: integer("current_row_number").notNull(),
  currentSide: text("current_side").notNull(), // "WS" or "RS"
  currentRepeatIteration: integer("current_repeat_iteration"),
  totalRowsCompleted: integer("total_rows_completed").notNull().default(0),
  currentStitchCount: integer("current_stitch_count"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

// Progress History - Undo/Redo tracking
export const progressHistory = sqliteTable("progress_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  blockId: integer("block_id").references(() => patternBlocks.id),
  rowNumber: integer("row_number").notNull(),
  side: text("side").notNull(), // "WS" or "RS"
  action: text("action").notNull(), // "increment" or "decrement"
  stitchCountAtTime: integer("stitch_count_at_time"),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Knitting Sessions - Time tracking for projects
export const knittingSessions = sqliteTable("knitting_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  startedAt: integer("started_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  endedAt: integer("ended_at", { mode: "timestamp" }),
  durationSeconds: integer("duration_seconds"),
});

// ============================================================================
// AUTH SCHEMA - Better Auth tables for user authentication
// ============================================================================

// Users - User accounts
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

// Sessions - Active user sessions
export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

// Accounts - OAuth provider accounts
export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

// Verification - Email/phone verification tokens
export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const CreateProjectSchema = createInsertSchema(projects, {
  name: z.string().min(1).max(256),
  selectedSize: z.enum(["small", "medium", "large"]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  isArchived: true,
  totalTimeSeconds: true,
});

export const CreatePatternSchema = createInsertSchema(patterns, {
  name: z.string().min(1).max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreatePatternBlockSchema = createInsertSchema(patternBlocks).omit({
  id: true,
});

export const CreatePatternRowSchema = createInsertSchema(patternRows).omit({
  id: true,
});
