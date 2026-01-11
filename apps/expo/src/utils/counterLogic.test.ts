import { describe, it, expect } from "vitest";
import {
  createInitialState,
  isComplete,
  canCheckSection1Row,
  canCheckSection2Row,
  checkSection1Row,
  checkSection2Row,
  resetCounter,
  getIncrementsPerCycle,
  getSection2ActiveRows,
  type CounterState,
} from "./counterLogic";

describe("counterLogic", () => {
  describe("createInitialState", () => {
    it("creates initial state with default target count of 45", () => {
      const state = createInitialState();
      expect(state.targetCount).toBe(45);
      expect(state.totalCount).toBe(0);
      expect(state.cycleCount).toBe(1);
      expect(state.currentSection).toBe(1);
    });

    it("creates initial state with custom target count", () => {
      const state = createInitialState(100);
      expect(state.targetCount).toBe(100);
    });

    it("initializes section1 with 2 unchecked rows and iteration 1", () => {
      const state = createInitialState();
      expect(state.section1.rows).toHaveLength(2);
      expect(state.section1.rows[0]?.checked).toBe(false);
      expect(state.section1.rows[1]?.checked).toBe(false);
      expect(state.section1.currentIteration).toBe(1);
    });

    it("initializes section2 with 4 unchecked rows and iteration 0", () => {
      const state = createInitialState();
      expect(state.section2.rows).toHaveLength(4);
      expect(state.section2.rows.every((r) => !r.checked)).toBe(true);
      expect(state.section2.currentIteration).toBe(0);
    });
  });

  describe("isComplete", () => {
    it("returns false when totalCount is less than targetCount", () => {
      const state = createInitialState(45);
      expect(isComplete(state)).toBe(false);
    });

    it("returns true when totalCount equals targetCount", () => {
      const state = { ...createInitialState(45), totalCount: 45 };
      expect(isComplete(state)).toBe(true);
    });

    it("returns true when totalCount exceeds targetCount", () => {
      const state = { ...createInitialState(45), totalCount: 50 };
      expect(isComplete(state)).toBe(true);
    });
  });

  describe("canCheckSection1Row", () => {
    it("allows checking row 0 when section 1 is active", () => {
      const state = createInitialState();
      expect(canCheckSection1Row(state, 0)).toBe(true);
    });

    it("does not allow checking row 1 before row 0", () => {
      const state = createInitialState();
      expect(canCheckSection1Row(state, 1)).toBe(false);
    });

    it("allows checking row 1 after row 0 is checked", () => {
      let state = createInitialState();
      state = checkSection1Row(state, 0);
      expect(canCheckSection1Row(state, 1)).toBe(true);
    });

    it("does not allow checking rows when section 2 is active", () => {
      const state: CounterState = {
        ...createInitialState(),
        currentSection: 2,
      };
      expect(canCheckSection1Row(state, 0)).toBe(false);
    });

    it("does not allow checking already checked rows", () => {
      let state = createInitialState();
      state = checkSection1Row(state, 0);
      expect(canCheckSection1Row(state, 0)).toBe(false);
    });

    it("does not allow checking when complete", () => {
      const state: CounterState = {
        ...createInitialState(45),
        totalCount: 45,
      };
      expect(canCheckSection1Row(state, 0)).toBe(false);
    });
  });

  describe("canCheckSection2Row", () => {
    it("does not allow checking when section 1 is active", () => {
      const state = createInitialState();
      expect(canCheckSection2Row(state, 0)).toBe(false);
    });

    it("allows checking row 0 when section 2 is active (iteration 0)", () => {
      const state: CounterState = {
        ...createInitialState(),
        currentSection: 2,
      };
      expect(canCheckSection2Row(state, 0)).toBe(true);
    });

    it("requires sequential checking in iteration 0 (rows 0-3)", () => {
      let state: CounterState = {
        ...createInitialState(),
        currentSection: 2,
      };

      // Can't check row 1 before row 0
      expect(canCheckSection2Row(state, 1)).toBe(false);

      // Check row 0
      state = checkSection2Row(state, 0);
      expect(canCheckSection2Row(state, 1)).toBe(true);
      expect(canCheckSection2Row(state, 2)).toBe(false);

      // Check row 1
      state = checkSection2Row(state, 1);
      expect(canCheckSection2Row(state, 2)).toBe(true);
      expect(canCheckSection2Row(state, 3)).toBe(false);
    });

    it("only allows rows 2-3 in iterations 1 and 2", () => {
      const state: CounterState = {
        ...createInitialState(),
        currentSection: 2,
        section2: {
          rows: [
            { checked: false },
            { checked: false },
            { checked: false },
            { checked: false },
          ],
          currentIteration: 1,
        },
      };

      expect(canCheckSection2Row(state, 0)).toBe(false);
      expect(canCheckSection2Row(state, 1)).toBe(false);
      expect(canCheckSection2Row(state, 2)).toBe(true);
      expect(canCheckSection2Row(state, 3)).toBe(false); // Must check 2 first
    });
  });

  describe("checkSection1Row", () => {
    it("checks row 0 and updates state", () => {
      const state = createInitialState();
      const newState = checkSection1Row(state, 0);
      expect(newState.section1.rows[0]?.checked).toBe(true);
      expect(newState.section1.rows[1]?.checked).toBe(false);
      expect(newState.totalCount).toBe(0); // Not incremented until row 1
    });

    it("increments counter when completing row 1", () => {
      let state = createInitialState();
      state = checkSection1Row(state, 0);
      state = checkSection1Row(state, 1);
      expect(state.totalCount).toBe(1);
    });

    it("resets rows and increments iteration after completing pair", () => {
      let state = createInitialState();
      state = checkSection1Row(state, 0);
      state = checkSection1Row(state, 1);

      expect(state.section1.rows[0]?.checked).toBe(false);
      expect(state.section1.rows[1]?.checked).toBe(false);
      expect(state.section1.currentIteration).toBe(2);
    });

    it("moves to section 2 after 3 iterations", () => {
      let state = createInitialState();

      // Complete 3 iterations
      for (let i = 0; i < 3; i++) {
        state = checkSection1Row(state, 0);
        state = checkSection1Row(state, 1);
      }

      expect(state.currentSection).toBe(2);
      expect(state.totalCount).toBe(3);
      expect(state.section1.currentIteration).toBe(1); // Reset for next cycle
    });

    it("returns unchanged state if check is not allowed", () => {
      const state = createInitialState();
      const newState = checkSection1Row(state, 1); // Can't check row 1 first
      expect(newState).toBe(state);
    });
  });

  describe("checkSection2Row", () => {
    it("completes iteration 0 (rows 1-4) and increments counter", () => {
      let state: CounterState = {
        ...createInitialState(),
        currentSection: 2,
      };

      // Check rows 0-3
      state = checkSection2Row(state, 0);
      state = checkSection2Row(state, 1);
      state = checkSection2Row(state, 2);
      state = checkSection2Row(state, 3);

      expect(state.totalCount).toBe(1);
      expect(state.section2.currentIteration).toBe(1);
    });

    it("completes iterations 1 and 2 (rows 3-4 only)", () => {
      let state: CounterState = {
        ...createInitialState(),
        currentSection: 2,
        section2: {
          rows: [
            { checked: false },
            { checked: false },
            { checked: false },
            { checked: false },
          ],
          currentIteration: 1,
        },
        totalCount: 1,
      };

      // Iteration 1: rows 2-3 (3-4 in UI)
      state = checkSection2Row(state, 2);
      state = checkSection2Row(state, 3);
      expect(state.totalCount).toBe(2);
      expect(state.section2.currentIteration).toBe(2);

      // Iteration 2: rows 2-3 (3-4 in UI)
      state = checkSection2Row(state, 2);
      state = checkSection2Row(state, 3);
      expect(state.totalCount).toBe(3);
    });

    it("returns to section 1 after completing all section 2 iterations", () => {
      let state: CounterState = {
        ...createInitialState(),
        currentSection: 2,
        section2: {
          rows: [
            { checked: false },
            { checked: false },
            { checked: false },
            { checked: false },
          ],
          currentIteration: 2,
        },
        totalCount: 2,
        cycleCount: 1,
      };

      // Complete iteration 2
      state = checkSection2Row(state, 2);
      state = checkSection2Row(state, 3);

      expect(state.currentSection).toBe(1);
      expect(state.cycleCount).toBe(2);
      expect(state.section2.currentIteration).toBe(0); // Reset
    });
  });

  describe("resetCounter", () => {
    it("resets state to initial values", () => {
      let state = createInitialState(45);
      state = { ...state, totalCount: 30, cycleCount: 5, currentSection: 2 };
      const resetState = resetCounter(state);

      expect(resetState.totalCount).toBe(0);
      expect(resetState.cycleCount).toBe(1);
      expect(resetState.currentSection).toBe(1);
      expect(resetState.targetCount).toBe(45); // Preserves target
    });
  });

  describe("getIncrementsPerCycle", () => {
    it("returns correct increments per cycle", () => {
      const increments = getIncrementsPerCycle();

      expect(increments.section1Increments).toBe(3); // 3 reps of row 1+2
      expect(increments.section2Increments).toBe(3); // 1 full + 2 repeats
      expect(increments.total).toBe(6);
    });
  });

  describe("getSection2ActiveRows", () => {
    it("returns all rows for iteration 0", () => {
      expect(getSection2ActiveRows(0)).toEqual([0, 1, 2, 3]);
    });

    it("returns only rows 2-3 for iteration 1", () => {
      expect(getSection2ActiveRows(1)).toEqual([2, 3]);
    });

    it("returns only rows 2-3 for iteration 2", () => {
      expect(getSection2ActiveRows(2)).toEqual([2, 3]);
    });
  });

  describe("full cycle integration", () => {
    it("completes a full cycle correctly", () => {
      let state = createInitialState(45);

      // Section 1: 3 iterations of row 1 + row 2
      for (let i = 0; i < 3; i++) {
        state = checkSection1Row(state, 0);
        state = checkSection1Row(state, 1);
      }
      expect(state.totalCount).toBe(3);
      expect(state.currentSection).toBe(2);

      // Section 2, iteration 0: rows 1-4
      state = checkSection2Row(state, 0);
      state = checkSection2Row(state, 1);
      state = checkSection2Row(state, 2);
      state = checkSection2Row(state, 3);
      expect(state.totalCount).toBe(4);

      // Section 2, iteration 1: rows 3-4
      state = checkSection2Row(state, 2);
      state = checkSection2Row(state, 3);
      expect(state.totalCount).toBe(5);

      // Section 2, iteration 2: rows 3-4
      state = checkSection2Row(state, 2);
      state = checkSection2Row(state, 3);
      expect(state.totalCount).toBe(6);

      // Back to section 1, cycle 2
      expect(state.currentSection).toBe(1);
      expect(state.cycleCount).toBe(2);
    });

    it("reaches target count of 45 after multiple cycles", () => {
      let state = createInitialState(45);
      const incrementsPerCycle = 6;
      const cyclesNeeded = Math.ceil(45 / incrementsPerCycle); // 8 cycles

      for (let cycle = 0; cycle < cyclesNeeded && !isComplete(state); cycle++) {
        // Section 1
        for (let i = 0; i < 3 && !isComplete(state); i++) {
          state = checkSection1Row(state, 0);
          state = checkSection1Row(state, 1);
        }

        if (isComplete(state)) break;

        // Section 2, iteration 0
        state = checkSection2Row(state, 0);
        state = checkSection2Row(state, 1);
        state = checkSection2Row(state, 2);
        state = checkSection2Row(state, 3);

        if (isComplete(state)) break;

        // Section 2, iterations 1-2
        for (let i = 0; i < 2 && !isComplete(state); i++) {
          state = checkSection2Row(state, 2);
          state = checkSection2Row(state, 3);
        }
      }

      expect(state.totalCount).toBeGreaterThanOrEqual(45);
      expect(isComplete(state)).toBe(true);
    });
  });
});
