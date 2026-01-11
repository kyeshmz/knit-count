import type { InferSelectModel } from "drizzle-orm";
import { useCallback } from "react";
import { Alert } from "react-native";
import { eq } from "drizzle-orm";

import type { BlockInfo } from "./useCounterStore";
import type { Database } from "~/lib/drizzle/client";
import {
  patternBlocks,
  patternRepeats,
  patternRows,
  progressHistory,
  projectProgress,
  projects,
} from "~/lib/drizzle/schema";
import { useCounterStore } from "./useCounterStore";

type Progress = InferSelectModel<typeof projectProgress>;
type Row = InferSelectModel<typeof patternRows>;

export function useCounterActions(db: Database | null) {
  const setAll = useCounterStore((state) => state.setAll);
  const reset = useCounterStore((state) => state.reset);
  const getState = useCounterStore.getState;

  const loadProject = useCallback(
    async (projectId: string) => {
      if (!db) return;

      const projectIdNum = Number(projectId);

      try {
        const proj = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectIdNum))
          .get();

        const prog = await db
          .select()
          .from(projectProgress)
          .where(eq(projectProgress.projectId, projectIdNum))
          .get();

        if (!proj || !prog) {
          console.error("Project or progress not found:", projectId);
          reset();
          return;
        }

        // Load all blocks
        const blocks = prog.patternId
          ? await db
              .select()
              .from(patternBlocks)
              .where(eq(patternBlocks.patternId, prog.patternId))
              .all()
          : [];

        let blockInfo: BlockInfo | null = null;
        let currentRow: Row | null = null;
        let nextRow: Row | null = null;

        // Load current block info
        if (prog.currentBlockId) {
          const block = await db
            .select()
            .from(patternBlocks)
            .where(eq(patternBlocks.id, prog.currentBlockId))
            .get();

          const rows = await db
            .select()
            .from(patternRows)
            .where(eq(patternRows.blockId, prog.currentBlockId))
            .orderBy(patternRows.rowNumber)
            .all();

          const repeats = await db
            .select()
            .from(patternRepeats)
            .where(eq(patternRepeats.blockId, prog.currentBlockId))
            .all();

          const blockRepeat = repeats.find(
            (r: any) => r.repeatType === "block",
          );
          const totalRepeats = blockRepeat?.timesToRepeat ?? 1;

          if (block) {
            blockInfo = {
              block,
              rows,
              repeats,
              totalRepeats,
            };

            const row = rows.find(
              (r: any) => r.rowNumber === prog.currentRowNumber,
            );
            if (row) {
              currentRow = row;

              const currentIndex = rows.findIndex(
                (r: any) => r.rowNumber === prog.currentRowNumber,
              );
              nextRow =
                currentIndex < rows.length - 1
                  ? (rows[currentIndex + 1] ?? null)
                  : (rows[0] ?? null);
            }
          }
        }

        // Update store
        setAll({
          project: proj,
          progress: prog,
          currentBlockInfo: blockInfo,
          currentRow,
          nextRow,
          allBlocks: blocks,
          isLoading: false,
        });

      } catch (error) {
        console.error("Error loading counter data:", error);
        reset();
      }
    },
    [db, setAll, reset],
  );

  const completeRow = useCallback(
    async (projectId: string) => {
      if (!db) return;

      const { progress, currentBlockInfo, nextRow, allBlocks } = getState();
      if (!progress || !currentBlockInfo || !nextRow) return;

      const projectIdNum = Number(projectId);

      // Find current row index
      const currentRowIndex = currentBlockInfo.rows.findIndex(
        (r: any) => r.rowNumber === progress.currentRowNumber,
      );

      // Check if we're at the last row of the block
      const isLastRowInBlock =
        currentRowIndex === currentBlockInfo.rows.length - 1;

      let newProgress: Progress;
      let newCurrentRow: Row;
      let newNextRow: Row | null;
      let newBlockInfo = currentBlockInfo;

      if (isLastRowInBlock) {
        // We finished all rows in this block
        const currentRepeat = progress.currentRepeatIteration ?? 1;

        if (currentRepeat < currentBlockInfo.totalRepeats) {
          // Start next repeat iteration
          const firstRow = currentBlockInfo.rows[0];
          if (!firstRow) return;

          newProgress = {
            ...progress,
            currentRowNumber: firstRow.rowNumber,
            currentSide: firstRow.side as "WS" | "RS",
            currentRepeatIteration: currentRepeat + 1,
            totalRowsCompleted: progress.totalRowsCompleted + 1,
            updatedAt: new Date(),
          };
          newCurrentRow = firstRow;
          newNextRow = currentBlockInfo.rows[1] ?? null;
        } else {
          // Move to next block
          const currentBlockIndex = allBlocks.findIndex(
            (b) => b.id === currentBlockInfo.block.id,
          );
          const nextBlock = allBlocks[currentBlockIndex + 1];

          if (!nextBlock) {
            // Pattern complete!
            Alert.alert("Pattern Complete!", "You finished the pattern!");
            return;
          }

          // Load next block's data
          const nextBlockRows = await db
            .select()
            .from(patternRows)
            .where(eq(patternRows.blockId, nextBlock.id))
            .orderBy(patternRows.rowNumber)
            .all();

          const nextBlockRepeats = await db
            .select()
            .from(patternRepeats)
            .where(eq(patternRepeats.blockId, nextBlock.id))
            .all();

          const blockRepeat = nextBlockRepeats.find(
            (r: any) => r.repeatType === "block",
          );
          const totalRepeats = blockRepeat?.timesToRepeat ?? 1;

          newBlockInfo = {
            block: nextBlock,
            rows: nextBlockRows,
            repeats: nextBlockRepeats,
            totalRepeats,
          };

          const firstRow = nextBlockRows[0];
          if (!firstRow) return;

          newProgress = {
            ...progress,
            currentBlockId: nextBlock.id,
            currentRowNumber: firstRow.rowNumber,
            currentSide: firstRow.side as "WS" | "RS",
            currentRepeatIteration: 1,
            totalRowsCompleted: progress.totalRowsCompleted + 1,
            updatedAt: new Date(),
          };
          newCurrentRow = firstRow;
          newNextRow = nextBlockRows[1] ?? null;
        }
      } else {
        // Move to next row in current block
        newProgress = {
          ...progress,
          currentRowNumber: nextRow.rowNumber,
          currentSide: nextRow.side as "WS" | "RS",
          totalRowsCompleted: progress.totalRowsCompleted + 1,
          updatedAt: new Date(),
        };
        newCurrentRow = nextRow;

        const nextIndex = currentRowIndex + 2;
        newNextRow =
          nextIndex < currentBlockInfo.rows.length
            ? (currentBlockInfo.rows[nextIndex] ?? null)
            : (currentBlockInfo.rows[0] ?? null);
      }

      // Update store first (instant UI feedback)
      setAll({
        progress: newProgress,
        currentRow: newCurrentRow,
        nextRow: newNextRow,
        currentBlockInfo: newBlockInfo,
      });

      // Update database asynchronously
      try {
        // Save to history
        await db.insert(progressHistory).values({
          projectId: projectIdNum,
          blockId: newProgress.currentBlockId,
          rowNumber: newProgress.currentRowNumber,
          side: newProgress.currentSide,
          action: "increment",
          stitchCountAtTime: newProgress.currentStitchCount ?? 0,
          timestamp: new Date(),
        });

        // Update progress
        await db
          .update(projectProgress)
          .set(newProgress)
          .where(eq(projectProgress.projectId, projectIdNum));

      } catch (error) {
        console.error("Error saving progress:", error);
      }
    },
    [db, setAll, getState],
  );

  const undo = useCallback(
    async (projectId: string) => {
      if (!db) return;

      const { progress } = getState();
      if (!progress) return;

      const projectIdNum = Number(projectId);

      try {
        // Get the last history entry
        const history = await db
          .select()
          .from(progressHistory)
          .where(eq(progressHistory.projectId, projectIdNum))
          .orderBy(progressHistory.timestamp)
          .all();

        if (history.length === 0) {
          Alert.alert("Cannot Undo", "No previous history available.");
          return;
        }

        // Remove the last history entry
        const lastEntry = history[history.length - 1];
        if (!lastEntry) return;

        // Get the previous entry if it exists
        const previousEntry = history[history.length - 2];
        if (!previousEntry) {
          Alert.alert("Cannot Undo", "Already at the beginning.");
          return;
        }

        // Load the block info for the previous state
        const prevBlock = await db
          .select()
          .from(patternBlocks)
          .where(eq(patternBlocks.id, previousEntry.blockId ?? 0))
          .get();

        if (!prevBlock) return;

        const prevRows = await db
          .select()
          .from(patternRows)
          .where(eq(patternRows.blockId, prevBlock.id))
          .orderBy(patternRows.rowNumber)
          .all();

        const prevRepeats = await db
          .select()
          .from(patternRepeats)
          .where(eq(patternRepeats.blockId, prevBlock.id))
          .all();

        const blockRepeat = prevRepeats.find(
          (r: any) => r.repeatType === "block",
        );
        const totalRepeats = blockRepeat?.timesToRepeat ?? 1;

        // Find the row
        const prevRow = prevRows.find(
          (r: any) => r.rowNumber === previousEntry.rowNumber,
        );
        if (!prevRow) return;

        // Update progress to previous state
        const newProgress: Progress = {
          ...progress,
          currentBlockId: previousEntry.blockId,
          currentRowNumber: previousEntry.rowNumber,
          currentSide: previousEntry.side as "WS" | "RS",
          totalRowsCompleted: Math.max(0, progress.totalRowsCompleted - 1),
          currentStitchCount: previousEntry.stitchCountAtTime ?? 0,
          updatedAt: new Date(),
        };

        // Update state
        const newBlockInfo: BlockInfo = {
          block: prevBlock,
          rows: prevRows,
          repeats: prevRepeats,
          totalRepeats,
        };

        const currentIndex = prevRows.findIndex(
          (r: any) => r.rowNumber === previousEntry.rowNumber,
        );
        const nextRow =
          currentIndex < prevRows.length - 1
            ? (prevRows[currentIndex + 1] ?? null)
            : (prevRows[0] ?? null);

        // Update store first (instant UI feedback)
        setAll({
          progress: newProgress,
          currentBlockInfo: newBlockInfo,
          currentRow: prevRow,
          nextRow,
        });

        // Update database
        await db
          .delete(progressHistory)
          .where(eq(progressHistory.id, lastEntry.id));

        await db
          .update(projectProgress)
          .set(newProgress)
          .where(eq(projectProgress.projectId, projectIdNum));
      } catch (error) {
        console.error("Error undoing:", error);
      }
    },
    [db, setAll, getState],
  );

  const redo = useCallback(async (projectId: string) => {
    Alert.alert("Redo", "Redo functionality coming soon!");
  }, []);

  return {
    loadProject,
    completeRow,
    undo,
    redo,
  };
}
