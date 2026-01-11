import { useEffect, useState } from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { router, Stack, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  createInitialState,
  checkSection1Row,
  checkSection2Row,
  resetCounter,
  isComplete as checkIsComplete,
  canCheckSection1Row,
  canCheckSection2Row,
  type CounterState,
} from "~/utils/counterLogic";
import {
  startRowCounterActivity,
  updateRowCounterActivity,
  stopRowCounterActivity,
  isActivityRunning,
} from "~/utils/liveActivity";

export default function Index() {
  const [state, setState] = useState<CounterState>(() => createInitialState(45));
  const [liveActivityActive, setLiveActivityActive] = useState(false);

  const isComplete = checkIsComplete(state);

  // Update Live Activity when state changes
  useEffect(() => {
    if (liveActivityActive && Platform.OS === "ios") {
      updateRowCounterActivity(state);
    }
  }, [state, liveActivityActive]);

  // Check Live Activity status on mount
  useEffect(() => {
    setLiveActivityActive(isActivityRunning());
  }, []);

  const handleSection1Check = (rowIndex: number) => {
    if (!canCheckSection1Row(state, rowIndex)) return;
    setState(checkSection1Row(state, rowIndex));
  };

  const handleSection2Check = (rowIndex: number) => {
    if (!canCheckSection2Row(state, rowIndex)) return;
    setState(checkSection2Row(state, rowIndex));
  };

  const handleReset = () => {
    setState(resetCounter(state));
  };

  const handleToggleLiveActivity = () => {
    if (Platform.OS !== "ios") {
      return;
    }

    if (liveActivityActive) {
      stopRowCounterActivity();
      setLiveActivityActive(false);
    } else {
      const activityId = startRowCounterActivity("Row Counter", state);
      setLiveActivityActive(!!activityId);
    }
  };

  const renderCheckbox = (
    checked: boolean,
    enabled: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!enabled || checked}
      className={`h-8 w-8 items-center justify-center rounded-lg border-2 ${
        checked
          ? "border-green-500 bg-green-500"
          : enabled
            ? "border-purple-500 bg-white"
            : "border-gray-300 bg-gray-100"
      }`}
    >
      {checked && <Ionicons name="checkmark" size={20} color="white" />}
    </TouchableOpacity>
  );

  const renderSection1Row = (rowIndex: number, label: string) => {
    const isActive = state.currentSection === 1;
    const checked = state.section1.rows[rowIndex]?.checked ?? false;
    const canCheck = canCheckSection1Row(state, rowIndex);

    return (
      <View
        key={`s1-${rowIndex}`}
        className={`mb-2 flex-row items-center justify-between rounded-lg p-3 ${
          isActive ? "bg-purple-50" : "bg-gray-50"
        }`}
      >
        <Text
          className={`text-base font-medium ${isActive ? "text-gray-900" : "text-gray-400"}`}
        >
          {label}
        </Text>
        {renderCheckbox(checked, canCheck, () => handleSection1Check(rowIndex))}
      </View>
    );
  };

  const renderSection2Row = (rowIndex: number, label: string) => {
    const isActive = state.currentSection === 2;
    const iteration = state.section2.currentIteration;
    const activeRows = iteration === 0 ? [0, 1, 2, 3] : [2, 3];
    const isRowActive = activeRows.includes(rowIndex);
    const checked = state.section2.rows[rowIndex]?.checked ?? false;
    const canCheck = canCheckSection2Row(state, rowIndex);

    return (
      <View
        key={`s2-${rowIndex}`}
        className={`mb-2 flex-row items-center justify-between rounded-lg p-3 ${
          isActive && isRowActive ? "bg-purple-50" : "bg-gray-50"
        }`}
      >
        <Text
          className={`text-base font-medium ${isActive && isRowActive ? "text-gray-900" : "text-gray-400"}`}
        >
          {label}
        </Text>
        {renderCheckbox(checked, canCheck, () => handleSection2Check(rowIndex))}
      </View>
    );
  };

  return (
    <GestureHandlerRootView className="flex-1">
      <View className="flex-1 bg-gray-50">
        <Stack.Screen
          options={{
            title: "Row Counter",
            headerRight: () => (
              <TouchableOpacity onPress={() => router.push("/projects" as Href)}>
                <Ionicons name="folder-outline" size={24} color="white" />
              </TouchableOpacity>
            ),
          }}
        />

        <ScrollView className="flex-1 px-4 pt-4">
          {/* Counter Display */}
          <View className="mb-6 items-center rounded-2xl bg-white p-6 shadow-sm">
            <Text className="text-sm font-medium uppercase text-gray-500">
              Total Count
            </Text>
            <Text
              className={`text-5xl font-bold ${isComplete ? "text-green-600" : "text-purple-600"}`}
            >
              {state.totalCount} / {state.targetCount}
            </Text>
            <Text className="mt-2 text-sm text-gray-500">
              Cycle {state.cycleCount} • Section {state.currentSection}
            </Text>
            {isComplete && (
              <View className="mt-3 rounded-full bg-green-100 px-4 py-2">
                <Text className="font-semibold text-green-700">Complete!</Text>
              </View>
            )}

            {/* Live Activity Toggle */}
            {Platform.OS === "ios" && (
              <TouchableOpacity
                className={`mt-4 flex-row items-center rounded-full px-4 py-2 ${
                  liveActivityActive ? "bg-green-100" : "bg-gray-100"
                }`}
                onPress={handleToggleLiveActivity}
              >
                <Ionicons
                  name={liveActivityActive ? "radio" : "radio-outline"}
                  size={16}
                  color={liveActivityActive ? "#16a34a" : "#6b7280"}
                />
                <Text
                  className={`ml-2 text-sm font-medium ${
                    liveActivityActive ? "text-green-700" : "text-gray-600"
                  }`}
                >
                  {liveActivityActive ? "Live Activity On" : "Start Live Activity"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Section 1 */}
          <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-gray-900">Section 1</Text>
              <View className="rounded-full bg-purple-100 px-3 py-1">
                <Text className="text-sm font-medium text-purple-700">
                  Rep {state.section1.currentIteration}/3
                </Text>
              </View>
            </View>
            <Text className="mb-3 text-xs text-gray-500">
              Check Row 1 before Row 2. Repeat 3 times.
            </Text>
            {renderSection1Row(0, "Row 1")}
            {renderSection1Row(1, "Row 2")}
          </View>

          {/* Section 2 */}
          <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-gray-900">Section 2</Text>
              <View className="rounded-full bg-purple-100 px-3 py-1">
                <Text className="text-sm font-medium text-purple-700">
                  {state.section2.currentIteration === 0
                    ? "Rows 1-4"
                    : `Rep ${state.section2.currentIteration}/2 (3-4)`}
                </Text>
              </View>
            </View>
            <Text className="mb-3 text-xs text-gray-500">
              Do rows 1-4 once, then repeat rows 3-4 two more times.
            </Text>
            {renderSection2Row(0, "Row 1")}
            {renderSection2Row(1, "Row 2")}
            {renderSection2Row(2, "Row 3")}
            {renderSection2Row(3, "Row 4")}
          </View>
        </ScrollView>

        {/* Bottom Buttons */}
        <View className="border-t border-gray-200 bg-white p-4">
          <TouchableOpacity
            className="mb-3 rounded-xl bg-indigo-500 py-4"
            onPress={() => router.push("/projects" as Href)}
          >
            <Text className="text-center text-base font-semibold text-white">
              My Projects
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="rounded-xl bg-gray-200 py-4"
            onPress={handleReset}
          >
            <Text className="text-center text-base font-semibold text-gray-700">
              Reset Counter
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
