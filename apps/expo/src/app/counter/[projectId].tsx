import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { eq } from "drizzle-orm";

import { PlusMinusCounter } from "~/components/PlusMinusCounter";
import { useCounterActions } from "~/hooks/useCounterActions";
import { useCounterStore } from "~/hooks/useCounterStore";
import { useDatabase } from "~/hooks/useDatabase";
import { patternRepeats, patternRows } from "~/lib/drizzle/schema";

export default function Counter() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { db } = useDatabase();
  const [stitchCount, setStitchCount] = useState(0);

  // Zustand store (state only)
  const {
    project,
    progress,
    currentBlockInfo,
    currentRow,
    nextRow,
    allBlocks,
    isLoading,
  } = useCounterStore();

  // Actions hook (DB operations)
  const { loadProject, completeRow, undo, redo } = useCounterActions(db);

  // Save as active project
  useEffect(() => {
    if (projectId) {
      void AsyncStorage.setItem("activeProjectId", projectId);
    }
  }, [projectId]);

  // Load data on mount and when screen focuses
  useFocusEffect(
    useCallback(() => {
      if (!projectId || !db) return;
      void loadProject(projectId);
    }, [projectId, loadProject, db]),
  );

  const handleBackToProjects = useCallback(() => {
    void AsyncStorage.removeItem("activeProjectId");
    router.replace("/");
  }, []);

  const handleUndo = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!projectId) return;
    void undo(projectId);
  }, [projectId, undo]);

  const handleRedo = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!projectId) return;
    void redo(projectId);
  }, [projectId, redo]);

  const handleCompleteRow = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!projectId) return;
    void completeRow(projectId);
  }, [projectId, completeRow]);

  const handleIncrementStitch = useCallback(() => {
    setStitchCount((prev) => prev + 1);
  }, []);

  const handleDecrementStitch = useCallback(() => {
    setStitchCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Memoize expensive calculations to prevent recalculation on every render
  const progressData = useMemo(() => {
    if (!currentBlockInfo || !progress) {
      return {
        rowProgress: 0,
        overallProgress: 0,
        currentBlockIndex: 0,
        totalBlockCount: 0,
        currentRowIndex: 0,
        totalRowsInBlock: 0,
        currentRepeat: 1,
        totalRepeats: 1,
        isNewBlock: false,
      };
    }

    const currentRowIndex =
      currentBlockInfo.rows.findIndex(
        (r) => r.rowNumber === progress.currentRowNumber,
      ) + 1;
    const totalRowsInBlock = currentBlockInfo.rows.length;
    const rowProgress =
      totalRowsInBlock > 0 ? (currentRowIndex / totalRowsInBlock) * 100 : 0;

    const currentRepeat = progress.currentRepeatIteration ?? 1;
    const totalRepeats = currentBlockInfo.totalRepeats;

    const currentBlockIndex = allBlocks.findIndex(
      (b) => b.id === currentBlockInfo.block.id,
    );
    const totalBlockCount = allBlocks.length;

    const isNewBlock = currentRowIndex === 1 && currentRepeat === 1;

    let totalRowsInPattern = 0;
    let completedRows = 0;

    const estimatedRowsPerBlock =
      currentBlockInfo.rows.length * currentBlockInfo.totalRepeats;

    totalRowsInPattern = allBlocks.length * estimatedRowsPerBlock;
    completedRows =
      currentBlockIndex * estimatedRowsPerBlock +
      (currentRepeat - 1) * currentBlockInfo.rows.length +
      (currentRowIndex - 1);

    const overallProgress =
      totalRowsInPattern > 0 ? (completedRows / totalRowsInPattern) * 100 : 0;

    return {
      rowProgress,
      overallProgress,
      currentBlockIndex: currentBlockIndex + 1,
      totalBlockCount,
      currentRowIndex,
      totalRowsInBlock,
      currentRepeat,
      totalRepeats,
      isNewBlock,
    };
  }, [currentBlockInfo, progress, allBlocks]);

  // Early return for loading state
  if (isLoading || !project || !progress || !currentRow || !currentBlockInfo) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-base text-gray-600">Loading...</Text>
      </View>
    );
  }

  const sideColor = currentRow.side === "WS" ? "bg-purple-100" : "bg-blue-100";
  const sideTextColor =
    currentRow.side === "WS" ? "text-purple-900" : "text-blue-900";
  const nextSideColor = nextRow?.side === "WS" ? "bg-purple-50" : "bg-blue-50";

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: project.name,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBackToProjects}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          ),
        }}
      />

      <View className="flex-1 items-center justify-center px-6">
        {/* New Section Announcement */}
        {progressData.isNewBlock && (
          <View className="mb-6 w-full max-w-md">
            <View className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 p-4 shadow-lg">
              <Text className="text-center text-lg font-bold text-white">
                🎉 New Section!
              </Text>
              <Text className="text-center text-sm font-medium text-white">
                {currentBlockInfo.block.name}
              </Text>
            </View>
          </View>
        )}

        <View className="mb-6 w-full max-w-md">
          <Text className="mb-2 text-center text-sm text-gray-600">
            Block {progressData.currentBlockIndex} of{" "}
            {progressData.totalBlockCount}
          </Text>
          <Text className="mb-2 text-center text-base font-medium text-gray-600">
            {currentBlockInfo.block.name}
          </Text>
          <Text className="mb-4 text-center text-sm text-gray-500">
            Row {progressData.currentRowIndex} of{" "}
            {progressData.totalRowsInBlock} • Repeat{" "}
            {progressData.currentRepeat} of {progressData.totalRepeats}
          </Text>

          {/* Overall Pattern Progress Bar */}
          <View className="mb-3">
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-xs font-medium text-gray-600">
                Overall Progress
              </Text>
              <Text className="text-xs text-gray-500">
                {Math.round(progressData.overallProgress)}%
              </Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-gray-200">
              <View
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${Math.round(progressData.overallProgress)}%`,
                }}
              />
            </View>
          </View>

          {/* Current Section/Row Progress Bar */}
          <View>
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-xs font-medium text-gray-600">
                Current Section
              </Text>
              <Text className="text-xs text-gray-500">
                {Math.round(progressData.rowProgress)}%
              </Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-gray-200">
              <View
                className="h-full rounded-full bg-purple-500"
                style={{ width: `${Math.round(progressData.rowProgress)}%` }}
              />
            </View>
          </View>
        </View>

        {/* Section Divider */}
        <View className="mb-6 w-full max-w-md">
          <View className="flex items-center">
            <View className="h-px flex-1 bg-gray-300" />
            <View className="mx-4 rounded-full bg-gray-100 px-4 py-1">
              <Text className="text-xs font-medium text-gray-500">
                Section Instructions
              </Text>
            </View>
            <View className="h-px flex-1 bg-gray-300" />
          </View>
        </View>

        {/* Section Instructions with Arrow */}
        <View className="mb-8 max-h-64 w-full max-w-md overflow-y-auto">
          <View className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            {currentBlockInfo.rows.map((row, index) => {
              const isCurrentRow = row.rowNumber === progress.currentRowNumber;
              const isCompleted = row.rowNumber < progress.currentRowNumber;

              return (
                <View key={row.id} className="relative">
                  {isCurrentRow && (
                    <View className="absolute -left-2 bottom-0 top-0 flex items-center">
                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color="#9333ea"
                      />
                    </View>
                  )}
                  <View
                    className={`rounded-xl p-3 ${
                      isCurrentRow
                        ? "border-2 border-purple-400 bg-purple-100"
                        : isCompleted
                          ? "bg-gray-100 opacity-50"
                          : "bg-gray-50"
                    }`}
                  >
                    <View className="flex-row items-start">
                      <Text
                        className={`mr-2 text-xs font-bold ${
                          isCurrentRow
                            ? "text-purple-700"
                            : isCompleted
                              ? "text-gray-400"
                              : "text-gray-500"
                        }`}
                      >
                        {row.side}
                      </Text>
                      <View className="flex-1">
                        <Text
                          className={`mb-1 text-xs font-medium ${
                            isCurrentRow
                              ? "text-purple-800"
                              : isCompleted
                                ? "text-gray-400"
                                : "text-gray-600"
                          }`}
                        >
                          Row {row.rowNumber}
                        </Text>
                        <Text
                          className={`text-sm ${
                            isCurrentRow
                              ? "font-medium text-gray-900"
                              : isCompleted
                                ? "text-gray-400"
                                : "text-gray-700"
                          }`}
                        >
                          {row.instruction}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {index < currentBlockInfo.rows.length - 1 && (
                    <View className="my-2 ml-6 border-l-2 border-dashed border-gray-200" />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Current Row Divider */}
        <View className="mb-6 w-full max-w-md">
          <View className="flex items-center">
            <View className="h-px flex-1 bg-gray-300" />
            <View className="mx-4 rounded-full bg-gray-100 px-4 py-1">
              <Text className="text-xs font-medium text-gray-500">
                Current Row
              </Text>
            </View>
            <View className="h-px flex-1 bg-gray-300" />
          </View>
        </View>

        {/* Current Row Card */}
        <View
          className={`mb-8 w-full max-w-md rounded-3xl ${sideColor} p-8 shadow-xl`}
        >
          <Text
            className={`mb-4 text-center text-2xl font-bold ${sideTextColor}`}
          >
            {currentRow.side}
          </Text>
          <Text className="mb-1 text-center text-xs font-medium uppercase tracking-wide text-gray-500">
            Row {progress.currentRowNumber}
          </Text>
          <Text className="text-center text-lg leading-relaxed text-gray-800">
            {currentRow.instruction}
          </Text>
        </View>

        {/* Next Row Preview */}
        {nextRow && (
          <View className="mb-8 w-full max-w-md">
            <Text className="mb-2 text-sm font-medium text-gray-500">
              Next:
            </Text>
            <View
              className={`rounded-2xl ${nextSideColor} border border-gray-200 p-4`}
            >
              <Text className="mb-1 text-xs font-medium text-gray-600">
                Row {nextRow.rowNumber} ({nextRow.side})
              </Text>
              <Text className="text-sm text-gray-700">
                {nextRow.instruction}
              </Text>
            </View>
          </View>
        )}

        {/* Plus/Minus Stitch Counter */}
        <View className="mb-6 w-full max-w-md">
          <Text className="mb-3 text-center text-sm font-medium text-gray-600">
            Stitch Count
          </Text>
          <PlusMinusCounter
            value={stitchCount}
            onIncrement={handleIncrementStitch}
            onDecrement={handleDecrementStitch}
          />
        </View>

        {/* Action Buttons */}
        <View className="w-full max-w-md gap-3">
          <TouchableOpacity
            className="rounded-2xl bg-green-600 px-8 py-6 shadow-lg active:bg-green-700"
            onPress={handleCompleteRow}
            activeOpacity={0.8}
          >
            <Text className="text-center text-2xl font-bold text-white">
              Complete Row
            </Text>
          </TouchableOpacity>

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 active:bg-gray-50"
              onPress={handleUndo}
              activeOpacity={0.8}
            >
              <Text className="text-center text-base font-semibold text-gray-700">
                Undo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 active:bg-gray-50"
              onPress={handleRedo}
              activeOpacity={0.8}
            >
              <Text className="text-center text-base font-semibold text-gray-700">
                Redo
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-6">
          <Text className="text-center text-sm text-gray-500">
            Total Rows: {progress.totalRowsCompleted}
          </Text>
          {progress.currentStitchCount != null &&
            progress.currentStitchCount > 0 && (
              <Text className="mt-1 text-center text-sm text-gray-500">
                Stitch Count: {progress.currentStitchCount}
              </Text>
            )}
        </View>
      </View>
    </View>
  );
}
