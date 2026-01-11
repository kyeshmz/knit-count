import { NativeModules, Platform } from "react-native";
import * as LiveActivity from "expo-live-activity";

import type { CounterState } from "./counterLogic";

// Native module for shared state with Live Activity widget
const { SharedStateModule } = NativeModules as {
  SharedStateModule?: {
    syncState: (state: SharedState) => void;
    getState: () => Promise<SharedState>;
  };
};

interface SharedState {
  section1Rows: boolean[];
  section1Iteration: number;
  section2Rows: boolean[];
  section2Iteration: number;
  currentSection: number;
  totalCount: number;
  cycleCount: number;
  targetCount: number;
  projectName: string;
}

/**
 * Convert CounterState to SharedState format for native module
 */
function toSharedState(state: CounterState, projectName: string): SharedState {
  return {
    section1Rows: state.section1.rows.map((r) => r.checked),
    section1Iteration: state.section1.currentIteration,
    section2Rows: state.section2.rows.map((r) => r.checked),
    section2Iteration: state.section2.currentIteration,
    currentSection: state.currentSection,
    totalCount: state.totalCount,
    cycleCount: state.cycleCount,
    targetCount: state.targetCount,
    projectName,
  };
}

/**
 * Sync state to native shared storage (App Groups UserDefaults)
 */
export function syncStateToNative(
  state: CounterState,
  projectName: string,
): void {
  if (Platform.OS !== "ios" || !SharedStateModule) {
    return;
  }

  try {
    SharedStateModule.syncState(toSharedState(state, projectName));
  } catch (error) {
    console.error("Failed to sync state to native:", error);
  }
}

/**
 * Get state from native shared storage
 */
export async function getStateFromNative(): Promise<SharedState | null> {
  if (Platform.OS !== "ios" || !SharedStateModule) {
    return null;
  }

  try {
    return await SharedStateModule.getState();
  } catch (error) {
    console.error("Failed to get state from native:", error);
    return null;
  }
}

// Store the current activity ID
let currentActivityId: string | undefined;

/**
 * Get the current row being worked on in the active section
 */
function getCurrentRowInfo(state: CounterState): {
  section: number;
  rowLabel: string;
  rowNumber: number;
  isRowChecked: boolean;
} {
  if (state.currentSection === 1) {
    // Section 1: Find the first unchecked row
    const row1Checked = state.section1.rows[0]?.checked ?? false;
    const row2Checked = state.section1.rows[1]?.checked ?? false;

    if (!row1Checked) {
      return { section: 1, rowLabel: "Row 1", rowNumber: 1, isRowChecked: false };
    } else if (!row2Checked) {
      return { section: 1, rowLabel: "Row 2", rowNumber: 2, isRowChecked: false };
    } else {
      // Both checked, waiting for next iteration
      return { section: 1, rowLabel: "Row 2", rowNumber: 2, isRowChecked: true };
    }
  } else {
    // Section 2
    const iteration = state.section2.currentIteration;
    const activeRows = iteration === 0 ? [0, 1, 2, 3] : [2, 3];

    // Find the first unchecked active row
    for (const rowIndex of activeRows) {
      if (!state.section2.rows[rowIndex]?.checked) {
        return {
          section: 2,
          rowLabel: `Row ${rowIndex + 1}`,
          rowNumber: rowIndex + 1,
          isRowChecked: false,
        };
      }
    }

    // All checked
    const lastRow = activeRows[activeRows.length - 1] ?? 3;
    return {
      section: 2,
      rowLabel: `Row ${lastRow + 1}`,
      rowNumber: lastRow + 1,
      isRowChecked: true,
    };
  }
}

/**
 * Generate the title showing only the current row
 */
function getTitle(state: CounterState): string {
  const { rowLabel } = getCurrentRowInfo(state);
  return rowLabel;
}

/**
 * Generate subtitle with section, rep info and overall progress
 */
function getSubtitle(state: CounterState): string {
  const sectionInfo = `Section ${state.currentSection}`;
  const repInfo =
    state.currentSection === 1
      ? `Rep ${state.section1.currentIteration}/3`
      : state.section2.currentIteration === 0
        ? "Rows 1-4"
        : `Rep ${state.section2.currentIteration}/2 (3-4)`;

  return `${sectionInfo} • ${repInfo} • ${state.totalCount}/${state.targetCount}`;
}

/**
 * Start a Live Activity for the row counter
 */
export function startRowCounterActivity(
  projectName: string,
  state: CounterState,
): string | undefined {
  if (Platform.OS !== "ios") {
    console.log("Live Activities only supported on iOS");
    return undefined;
  }

  // Stop any existing activity first
  if (currentActivityId) {
    stopRowCounterActivity();
  }

  const activityState: LiveActivity.LiveActivityState = {
    title: getTitle(state),
    subtitle: getSubtitle(state),
    progressBar: {
      progress: state.totalCount / state.targetCount,
    },
  };

  const config: LiveActivity.LiveActivityConfig = {
    backgroundColor: "#FFFFFF",
    titleColor: "#7C3AED", // Purple
    subtitleColor: "#374151", // Gray-700
    progressViewTint: "#7C3AED", // Purple progress bar
    progressViewLabelColor: "#FFFFFF",
    deepLinkUrl: "/", // Open the app when tapped
  };

  try {
    const result = LiveActivity.startActivity(activityState, config);
    if (typeof result === "string") {
      currentActivityId = result;
      return currentActivityId;
    }
    return undefined;
  } catch (error) {
    console.error("Failed to start Live Activity:", error);
    return undefined;
  }
}

/**
 * Update the Live Activity with new counter state
 */
export function updateRowCounterActivity(state: CounterState): void {
  if (Platform.OS !== "ios" || !currentActivityId) {
    return;
  }

  const activityState: LiveActivity.LiveActivityState = {
    title: getTitle(state),
    subtitle: getSubtitle(state),
    progressBar: {
      progress: state.totalCount / state.targetCount,
    },
  };

  try {
    LiveActivity.updateActivity(currentActivityId, activityState);
  } catch (error) {
    console.error("Failed to update Live Activity:", error);
  }
}

/**
 * Stop the current Live Activity
 */
export function stopRowCounterActivity(): void {
  if (Platform.OS !== "ios" || !currentActivityId) {
    return;
  }

  try {
    LiveActivity.stopActivity(currentActivityId, {
      title: "Session Complete",
      subtitle: "Tap to continue knitting",
    });
    currentActivityId = undefined;
  } catch (error) {
    console.error("Failed to stop Live Activity:", error);
  }
}

/**
 * Check if a Live Activity is currently running
 */
export function isActivityRunning(): boolean {
  return currentActivityId !== undefined;
}

/**
 * Get the current activity ID
 */
export function getCurrentActivityId(): string | undefined {
  return currentActivityId;
}

/**
 * Sync counter state to Live Activity (convenience function)
 * Call this after any counter state change
 */
export function syncToLiveActivity(
  projectName: string,
  state: CounterState,
): void {
  if (Platform.OS !== "ios") {
    return;
  }

  // Always sync to native shared storage for Live Activity button interactions
  syncStateToNative(state, projectName);

  if (!currentActivityId) {
    // Start a new activity if none exists
    startRowCounterActivity(projectName, state);
  } else {
    // Update the existing activity
    updateRowCounterActivity(state);
  }
}
