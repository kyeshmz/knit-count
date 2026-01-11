import type { InferSelectModel } from "drizzle-orm";
import { create } from "zustand";

import {
  patternBlocks,
  patternRepeats,
  patternRows,
  projectProgress,
  projects,
} from "~/lib/drizzle/schema";

type Project = InferSelectModel<typeof projects>;
type Progress = InferSelectModel<typeof projectProgress>;
type Block = InferSelectModel<typeof patternBlocks>;
type Row = InferSelectModel<typeof patternRows>;
type Repeat = InferSelectModel<typeof patternRepeats>;

export interface BlockInfo {
  block: Block;
  rows: Row[];
  repeats: Repeat[];
  totalRepeats: number;
}

interface CounterState {
  // State
  project: Project | null;
  progress: Progress | null;
  currentBlockInfo: BlockInfo | null;
  currentRow: Row | null;
  nextRow: Row | null;
  allBlocks: Block[];
  isLoading: boolean;

  // Actions (only state setters, no DB operations)
  setProject: (project: Project | null) => void;
  setProgress: (progress: Progress | null) => void;
  setCurrentBlockInfo: (blockInfo: BlockInfo | null) => void;
  setCurrentRow: (row: Row | null) => void;
  setNextRow: (row: Row | null) => void;
  setAllBlocks: (blocks: Block[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setAll: (state: Partial<Omit<CounterState, keyof CounterActions>>) => void;
  reset: () => void;
}

type CounterActions = Pick<
  CounterState,
  | "setProject"
  | "setProgress"
  | "setCurrentBlockInfo"
  | "setCurrentRow"
  | "setNextRow"
  | "setAllBlocks"
  | "setIsLoading"
  | "setAll"
  | "reset"
>;

const initialState = {
  project: null,
  progress: null,
  currentBlockInfo: null,
  currentRow: null,
  nextRow: null,
  allBlocks: [],
  isLoading: true,
};

export const useCounterStore = create<CounterState>((set) => ({
  ...initialState,

  setProject: (project) => set({ project }),
  setProgress: (progress) => set({ progress }),
  setCurrentBlockInfo: (currentBlockInfo) => set({ currentBlockInfo }),
  setCurrentRow: (currentRow) => set({ currentRow }),
  setNextRow: (nextRow) => set({ nextRow }),
  setAllBlocks: (allBlocks) => set({ allBlocks }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setAll: (state) => set(state),
  reset: () => set(initialState),
}));
