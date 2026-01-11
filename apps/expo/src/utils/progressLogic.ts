/**
 * Core logic for managing knitting pattern progress
 */

import { eq } from "drizzle-orm";

import type { Database } from "~/lib/drizzle/client";
import {
  patternBlocks,
  patternRepeats,
  patternRows,
  progressHistory,
  projectProgress,
} from "~/lib/drizzle/schema";

export interface ProgressState {
  currentBlockId: number;
  currentRowNumber: number;
  currentSide: "WS" | "RS";
  currentRepeatIteration: number;
  totalRowsCompleted: number;
  currentStitchCount: number;
}

export function getNextRow(
  db: Database,
  projectId: number,
  patternId: number,
): ProgressState | null {
  // Get current progress
  const progress = db
    .select()
    .from(projectProgress)
    .where(eq(projectProgress.projectId, projectId))
    .get();

  if (!progress) return null;

  // Get all blocks for this pattern
  const allBlocks = db
    .select()
    .from(patternBlocks)
    .where(eq(patternBlocks.patternId, patternId))
    .all();

  // Get current block
  const currentBlockIndex = allBlocks.findIndex(
    (b: { id: number }) => b.id === progress.currentBlockId,
  );
  if (currentBlockIndex === -1) return null;

  const currentBlock = allBlocks[currentBlockIndex];
  if (!currentBlock) return null;

  // Get all rows for current block
  const rows = db
    .select()
    .from(patternRows)
    .where(eq(patternRows.blockId, currentBlock.id))
    .orderBy(patternRows.rowNumber)
    .all();

  // Get repeats for current block
  const repeats = db
    .select()
    .from(patternRepeats)
    .where(eq(patternRepeats.blockId, currentBlock.id))
    .all();

  // Calculate next row
  const currentRowIndex = rows.findIndex(
    (r: { rowNumber: number }) => r.rowNumber === progress.currentRowNumber,
  );
  const nextRowIndex = currentRowIndex + 1;

  // Check if we need to move to next block or repeat
  if (nextRowIndex >= rows.length) {
    // Check if we need to repeat current block
    const blockRepeat = repeats.find((r: { repeatType: string }) => r.repeatType === "block");
    if (
      blockRepeat &&
      (progress.currentRepeatIteration ?? 1) < blockRepeat.timesToRepeat
    ) {
      // Stay in same block, start from first row
      const firstRow = rows[0];
      if (!firstRow) return null;
      return {
        currentBlockId: currentBlock.id,
        currentRowNumber: firstRow.rowNumber,
        currentSide: firstRow.side as "WS" | "RS",
        currentRepeatIteration: (progress.currentRepeatIteration ?? 1) + 1,
        totalRowsCompleted: progress.totalRowsCompleted + 1,
        currentStitchCount: progress.currentStitchCount ?? 0,
      };
    }

    // Move to next block
    const nextBlock = allBlocks[currentBlockIndex + 1];
    if (!nextBlock) {
      // Pattern complete
      return null;
    }

    const nextBlockRows = db
      .select()
      .from(patternRows)
      .where(eq(patternRows.blockId, nextBlock.id))
      .orderBy(patternRows.rowNumber)
      .all();

    return {
      currentBlockId: nextBlock.id,
      currentRowNumber: nextBlockRows[0]?.rowNumber ?? 1,
      currentSide: (nextBlockRows[0]?.side ?? "RS") as "WS" | "RS",
      currentRepeatIteration: 1,
      totalRowsCompleted: progress.totalRowsCompleted + 1,
      currentStitchCount: progress.currentStitchCount ?? 0,
    };
  }

  // Move to next row in current block
  const nextRow = rows[nextRowIndex];
  if (!nextRow) return null;
  const newStitchCount =
    (progress.currentStitchCount ?? 0) + (nextRow.stitchChangeAmount ?? 0);

  return {
    currentBlockId: currentBlock.id,
    currentRowNumber: nextRow.rowNumber,
    currentSide: nextRow.side as "WS" | "RS",
    currentRepeatIteration: progress.currentRepeatIteration ?? 1,
    totalRowsCompleted: progress.totalRowsCompleted + 1,
    currentStitchCount: newStitchCount,
  };
}

export function saveProgressToHistory(
  db: Database,
  projectId: number,
  state: ProgressState,
  action: "increment" | "decrement",
): void {
  db.insert(progressHistory)
    .values({
      projectId,
      blockId: state.currentBlockId,
      rowNumber: state.currentRowNumber,
      side: state.currentSide,
      action,
      stitchCountAtTime: state.currentStitchCount,
      timestamp: new Date(),
    })
    .run();
}

export function undoLastRow(
  db: Database,
  projectId: number,
): ProgressState | null {
  // Get last two history entries (current and previous)
  const history = db
    .select()
    .from(progressHistory)
    .where(eq(progressHistory.projectId, projectId))
    .orderBy(progressHistory.timestamp)
    .limit(2)
    .all();

  if (history.length < 2) return null;

  const previous = history[history.length - 2];
  if (!previous) return null;

  return {
    currentBlockId: previous.blockId ?? 0,
    currentRowNumber: previous.rowNumber,
    currentSide: previous.side as "WS" | "RS",
    currentRepeatIteration: 1, // TODO: Track this in history
    totalRowsCompleted: 0, // TODO: Calculate
    currentStitchCount: previous.stitchCountAtTime ?? 0,
  };
}
