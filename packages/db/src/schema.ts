import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Projects - Top-level knitting projects
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  selectedSize: text("selected_size").notNull(),
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

// Pattern Blocks
export const patternBlocks = sqliteTable("pattern_blocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patternId: integer("pattern_id")
    .notNull()
    .references(() => patterns.id, { onDelete: "cascade" }),
  blockOrder: integer("block_order").notNull(),
  name: text("name").notNull(),
  description: text("description"),
});

// Pattern Rows
export const patternRows = sqliteTable("pattern_rows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  blockId: integer("block_id")
    .notNull()
    .references(() => patternBlocks.id, { onDelete: "cascade" }),
  rowNumber: integer("row_number").notNull(),
  side: text("side").notNull(),
  instruction: text("instruction").notNull(),
  stitchChangeType: text("stitch_change_type").notNull().default("none"),
  hasSpecialAction: integer("has_special_action", { mode: "boolean" })
    .notNull()
    .default(false),
  specialActionNote: text("special_action_note"),
  stitchChangeAmount: integer("stitch_change_amount").default(0),
});

// Pattern Repeats
export const patternRepeats = sqliteTable("pattern_repeats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  blockId: integer("block_id")
    .notNull()
    .references(() => patternBlocks.id, { onDelete: "cascade" }),
  repeatType: text("repeat_type").notNull(),
  startRowNumber: integer("start_row_number"),
  endRowNumber: integer("end_row_number"),
  timesToRepeat: integer("times_to_repeat").notNull(),
  sizeVariations: text("size_variations"),
});

// Project Progress
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
  currentSide: text("current_side").notNull(),
  currentRepeatIteration: integer("current_repeat_iteration"),
  totalRowsCompleted: integer("total_rows_completed").notNull().default(0),
  currentStitchCount: integer("current_stitch_count"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

export const CreateProjectSchema = createInsertSchema(projects, {
  name: z.string().min(1).max(256),
  description: z.string().max(1000).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export * from "./auth-schema";
