export interface RowState {
  checked: boolean;
}

export interface SectionState {
  rows: RowState[];
  currentIteration: number;
}

export interface CounterState {
  section1: SectionState;
  section2: SectionState;
  currentSection: 1 | 2;
  totalCount: number;
  cycleCount: number;
  targetCount: number;
}

export function createInitialState(targetCount = 45): CounterState {
  return {
    section1: {
      rows: [{ checked: false }, { checked: false }],
      currentIteration: 1,
    },
    section2: {
      rows: [
        { checked: false },
        { checked: false },
        { checked: false },
        { checked: false },
      ],
      currentIteration: 0,
    },
    currentSection: 1,
    totalCount: 0,
    cycleCount: 1,
    targetCount,
  };
}

export function isComplete(state: CounterState): boolean {
  return state.totalCount >= state.targetCount;
}

export function canCheckSection1Row(
  state: CounterState,
  rowIndex: number,
): boolean {
  if (state.currentSection !== 1) return false;
  if (isComplete(state)) return false;
  if (state.section1.rows[rowIndex]?.checked) return false;

  // Can't check row 2 (index 1) without row 1 (index 0) being checked
  if (rowIndex === 1 && !state.section1.rows[0]?.checked) return false;

  return true;
}

export function canCheckSection2Row(
  state: CounterState,
  rowIndex: number,
): boolean {
  if (state.currentSection !== 2) return false;
  if (isComplete(state)) return false;
  if (state.section2.rows[rowIndex]?.checked) return false;

  const iteration = state.section2.currentIteration;
  const activeRows = iteration === 0 ? [0, 1, 2, 3] : [2, 3];
  const activeRowIndex = activeRows.indexOf(rowIndex);

  // Row not active in this iteration
  if (activeRowIndex === -1) return false;

  // Can't check without previous row being checked
  if (activeRowIndex > 0) {
    const prevRow = activeRows[activeRowIndex - 1];
    if (prevRow !== undefined && !state.section2.rows[prevRow]?.checked) {
      return false;
    }
  }

  return true;
}

export function checkSection1Row(
  state: CounterState,
  rowIndex: number,
): CounterState {
  if (!canCheckSection1Row(state, rowIndex)) {
    return state;
  }

  const newRows = [...state.section1.rows];
  newRows[rowIndex] = { checked: true };

  // If checking row 2 (completing a pair)
  if (rowIndex === 1) {
    const newTotalCount = state.totalCount + 1;

    if (state.section1.currentIteration < 3) {
      // Reset rows for next iteration
      return {
        ...state,
        section1: {
          rows: [{ checked: false }, { checked: false }],
          currentIteration: state.section1.currentIteration + 1,
        },
        totalCount: newTotalCount,
      };
    } else {
      // Move to Section 2
      return {
        ...state,
        section1: {
          rows: [{ checked: false }, { checked: false }],
          currentIteration: 1,
        },
        currentSection: 2,
        totalCount: newTotalCount,
      };
    }
  }

  // Just checking row 1
  return {
    ...state,
    section1: {
      ...state.section1,
      rows: newRows,
    },
  };
}

export function checkSection2Row(
  state: CounterState,
  rowIndex: number,
): CounterState {
  if (!canCheckSection2Row(state, rowIndex)) {
    return state;
  }

  const iteration = state.section2.currentIteration;
  const activeRows = iteration === 0 ? [0, 1, 2, 3] : [2, 3];

  const newRows = [...state.section2.rows];
  newRows[rowIndex] = { checked: true };

  // Check if this completes the current iteration
  const isLastRowInIteration = rowIndex === activeRows[activeRows.length - 1];

  if (isLastRowInIteration) {
    const newTotalCount = state.totalCount + 1;

    if (iteration < 2) {
      // Move to next iteration (3-4 repeat)
      return {
        ...state,
        section2: {
          rows: [
            { checked: false },
            { checked: false },
            { checked: false },
            { checked: false },
          ],
          currentIteration: iteration + 1,
        },
        totalCount: newTotalCount,
      };
    } else {
      // Completed Section 2, go back to Section 1
      return {
        ...state,
        section2: {
          rows: [
            { checked: false },
            { checked: false },
            { checked: false },
            { checked: false },
          ],
          currentIteration: 0,
        },
        currentSection: 1,
        cycleCount: state.cycleCount + 1,
        totalCount: newTotalCount,
      };
    }
  }

  // Just checking an intermediate row
  return {
    ...state,
    section2: {
      ...state.section2,
      rows: newRows,
    },
  };
}

export function resetCounter(state: CounterState): CounterState {
  return createInitialState(state.targetCount);
}

/**
 * Simulate completing one full cycle (Section 1 x3 + Section 2 with repeats)
 * Returns the number of increments per cycle
 */
export function getIncrementsPerCycle(): {
  section1Increments: number;
  section2Increments: number;
  total: number;
} {
  // Section 1: 3 repetitions of Row 1 + Row 2 = 3 increments
  const section1Increments = 3;

  // Section 2: 1 time through rows 1-4, then 2 more times through rows 3-4
  // = 1 + 2 = 3 increments
  const section2Increments = 3;

  return {
    section1Increments,
    section2Increments,
    total: section1Increments + section2Increments,
  };
}

/**
 * Get the active rows for Section 2 based on iteration
 */
export function getSection2ActiveRows(iteration: number): number[] {
  return iteration === 0 ? [0, 1, 2, 3] : [2, 3];
}
