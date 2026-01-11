import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";

import { useDatabase } from "~/hooks/useDatabase";
import {
  patternBlocks,
  patternRepeats,
  patternRows,
  patterns,
  projectProgress,
  projects,
} from "~/lib/drizzle/schema";
import { useTRPC } from "~/utils/api";

type Size = "small" | "medium" | "large";

interface RowForm {
  rowNumber: number;
  side: "WS" | "RS";
  instruction: string;
  stitchChangeType: "increase" | "decrease" | "none";
  specialActionNote: string;
  stitchChangeAmount: number;
}

interface BlockForm {
  name: string;
  rows: RowForm[];
  repeatType: "none" | "block" | "rows";
  timesToRepeat: number;
  sizeVariations: Record<Size, number>;
}

interface ParsedRow {
  rowNumber: number;
  side: string;
  instruction: string;
  stitchChangeType: string;
  specialActionNote: string;
  stitchChangeAmount: number;
}

interface ParsedRepeat {
  repeatType: string;
  timesToRepeat: number;
  startRowNumber: number;
  endRowNumber: number;
  sizeVariations: { small: number; medium: number; large: number };
}

interface ParsedBlock {
  name: string;
  rows: ParsedRow[];
  repeats: ParsedRepeat[];
}

interface _ParsedPattern {
  patternName: string;
  blocks: ParsedBlock[];
}
// Prefixed with _ to indicate intentionally unused (for reference)

export default function PatternEditor() {
  const { db } = useDatabase();
  const trpc = useTRPC();
  const [showAIInput, setShowAIInput] = useState(false);
  const [aiPatternText, setAiPatternText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [patternName, setPatternName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectSize, setProjectSize] = useState<Size>("medium");
  const [blocks, setBlocks] = useState<BlockForm[]>([
    {
      name: "Block 1",
      rows: [
        {
          rowNumber: 1,
          side: "WS",
          instruction: "",
          stitchChangeType: "none",
          specialActionNote: "",
          stitchChangeAmount: 0,
        },
      ],
      repeatType: "none",
      timesToRepeat: 1,
      sizeVariations: { small: 1, medium: 2, large: 3 },
    },
  ]);

  const parsePatternMutation = useMutation(
    trpc.pattern.parsePattern.mutationOptions(),
  );

  const handleGenerateFromAI = () => {
    if (!aiPatternText.trim()) {
      Alert.alert("Error", "Please enter knitting instructions");
      return;
    }

    setIsGenerating(true);
    parsePatternMutation.mutate(
      { instructions: aiPatternText },
      {
        onSuccess: (parsed) => {
          setPatternName(parsed.patternName);
          setBlocks(
            parsed.blocks.map((block) => ({
              name: block.name,
              rows: block.rows.map((row) => ({
                rowNumber: row.rowNumber,
                side: row.side === "WS" ? "WS" : "RS",
                instruction: row.instruction,
                stitchChangeType:
                  row.stitchChangeType === "increase"
                    ? "increase"
                    : row.stitchChangeType === "decrease"
                      ? "decrease"
                      : "none",
                specialActionNote: row.specialActionNote,
                stitchChangeAmount: row.stitchChangeAmount,
              })),
              repeatType:
                block.repeats[0]?.repeatType === "block"
                  ? "block"
                  : block.repeats[0]?.repeatType === "rows"
                    ? "rows"
                    : "none",
              timesToRepeat: block.repeats[0]?.timesToRepeat ?? 1,
              sizeVariations: block.repeats[0]?.sizeVariations ?? {
                small: 1,
                medium: 1,
                large: 1,
              },
            })),
          );
          setShowAIInput(false);
          Alert.alert(
            "Success",
            "Pattern generated! Review and edit as needed.",
          );
          setIsGenerating(false);
        },
        onError: (error) => {
          Alert.alert("Error", `Failed to generate pattern: ${error.message}`);
          console.error(error);
          setIsGenerating(false);
        },
      },
    );
  };

  const addBlock = () => {
    setBlocks([
      ...blocks,
      {
        name: `Block ${blocks.length + 1}`,
        rows: [
          {
            rowNumber: 1,
            side: "WS",
            instruction: "",
            stitchChangeType: "none",
            specialActionNote: "",
            stitchChangeAmount: 0,
          },
        ],
        repeatType: "none",
        timesToRepeat: 1,
        sizeVariations: { small: 1, medium: 2, large: 3 },
      },
    ]);
  };

  const addRow = (blockIndex: number) => {
    const newBlocks = [...blocks];
    const block = newBlocks[blockIndex];
    if (!block) return;
    const lastRow = block.rows[block.rows.length - 1];
    if (!lastRow) return;
    block.rows.push({
      rowNumber: lastRow.rowNumber + 1,
      side: lastRow.side === "WS" ? "RS" : "WS",
      instruction: "",
      stitchChangeType: "none",
      specialActionNote: "",
      stitchChangeAmount: 0,
    });
    setBlocks(newBlocks);
  };

  const updateRow = (
    blockIndex: number,
    rowIndex: number,
    field: keyof RowForm,
    value: string | boolean | number,
  ) => {
    const newBlocks = [...blocks];
    const block = newBlocks[blockIndex];
    if (!block) return;
    const row = block.rows[rowIndex];
    if (!row) return;
    (row[field] as string | boolean | number) = value;
    setBlocks(newBlocks);
  };

  const savePattern = () => {
    // Validate required fields
    if (!projectName.trim()) {
      Alert.alert("Error", "Please enter a project name");
      return;
    }
    if (!patternName.trim()) {
      Alert.alert("Error", "Please enter a pattern name");
      return;
    }

    try {
      // Create pattern
      const patternResult = db
        .insert(patterns)
        .values({
          name: patternName.trim(),
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute();

      const patternId = patternResult.lastInsertRowId;

      // Create blocks and rows
      let firstBlockId: number | null = null;
      for (const block of blocks) {
        const blockResult = db
          .insert(patternBlocks)
          .values({
            patternId,
            blockOrder: blocks.indexOf(block) + 1,
            name: block.name,
            description: null,
          })
          .run();

        const blockId = blockResult.lastInsertRowId;

        // Store the first block ID
        firstBlockId ??= blockId;

        // Add rows
        for (const row of block.rows) {
          db.insert(patternRows)
            .values({
              blockId,
              rowNumber: row.rowNumber,
              side: row.side,
              instruction: row.instruction,
              stitchChangeType: row.stitchChangeType,
              hasSpecialAction: !!row.specialActionNote,
              specialActionNote: row.specialActionNote || null,
              stitchChangeAmount: row.stitchChangeAmount || 0,
            })
            .run();
        }

        // Add repeat if configured
        if (block.repeatType !== "none") {
          db.insert(patternRepeats)
            .values({
              blockId,
              repeatType: block.repeatType,
              startRowNumber: null,
              endRowNumber: null,
              timesToRepeat: block.timesToRepeat,
              sizeVariations: JSON.stringify(block.sizeVariations),
            })
            .run();
        }
      }

      // Create project
      const projectResult = db
        .insert(projects)
        .values({
          name: projectName,
          description: null,
          selectedSize: projectSize,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
          isArchived: false,
          notes: null,
          totalTimeSeconds: 0,
        })
        .run();

      const projectId = projectResult.lastInsertRowId;

      // Initialize progress
      const firstBlock = blocks[0];
      const firstRow = firstBlock?.rows[0];
      if (firstBlockId && firstRow) {
        db.insert(projectProgress)
          .values({
            projectId,
            patternId,
            currentBlockId: firstBlockId,
            currentRowNumber: firstRow.rowNumber,
            currentSide: firstRow.side,
            currentRepeatIteration: 1,
            totalRowsCompleted: 0,
            currentStitchCount: 0,
            updatedAt: new Date(),
          })
          .run();
      }

      router.replace("/");
    } catch (error) {
      console.error("Error saving pattern:", error);
      Alert.alert("Error", "Failed to save pattern");
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <Text className="mb-4 text-2xl font-bold text-gray-900">
          Create New Pattern
        </Text>

        {/* AI Pattern Generator Toggle */}
        <View className="mb-4 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 p-4 shadow-sm">
          <TouchableOpacity
            className="flex-row items-center justify-between"
            onPress={() => setShowAIInput(!showAIInput)}
          >
            <View className="flex-1">
              <Text className="text-lg font-semibold text-purple-900">
                ✨ AI Pattern Generator
              </Text>
              <Text className="mt-1 text-sm text-purple-700">
                {showAIInput
                  ? "Hide"
                  : "Paste knitting instructions to auto-generate pattern"}
              </Text>
            </View>
            <Text className="text-2xl text-purple-600">
              {showAIInput ? "▼" : "▶"}
            </Text>
          </TouchableOpacity>

          {showAIInput && (
            <View className="mt-4">
              <TextInput
                className="min-h-[120px] rounded-lg border-2 border-purple-200 bg-white p-3 text-base"
                value={aiPatternText}
                onChangeText={setAiPatternText}
                placeholder="Paste your knitting instructions here...&#10;&#10;Example:&#10;Row 1 (WS): Knit to last 3 sts, slip 3 purl-wise wyif.&#10;Row 2 (RS): Same as Row 1.&#10;Repeat Rows 1-2 three times."
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity
                className="mt-3 flex-row items-center justify-center rounded-lg bg-purple-600 py-3"
                onPress={handleGenerateFromAI}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="font-semibold text-white">
                      Generating...
                    </Text>
                  </View>
                ) : (
                  <Text className="font-semibold text-white">
                    Generate Pattern with AI
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Pattern Metadata */}
        <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="mb-2 text-sm font-medium text-gray-700">
            Pattern Name
          </Text>
          <TextInput
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base"
            value={patternName}
            onChangeText={setPatternName}
            placeholder="My Sweater Pattern"
          />
        </View>

        <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="mb-2 text-sm font-medium text-gray-700">
            Project Name
          </Text>
          <TextInput
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base"
            value={projectName}
            onChangeText={setProjectName}
            placeholder="Cozy Winter Sweater"
          />
        </View>

        <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <Text className="mb-3 text-sm font-medium text-gray-700">Size</Text>
          <View className="flex-row space-x-2">
            {(["small", "medium", "large"] as Size[]).map((size) => (
              <TouchableOpacity
                key={size}
                className={`flex-1 rounded-lg border-2 py-2 ${
                  projectSize === size
                    ? "border-purple-600 bg-purple-50"
                    : "border-gray-300 bg-white"
                }`}
                onPress={() => setProjectSize(size)}
              >
                <Text
                  className={`text-center font-medium capitalize ${
                    projectSize === size ? "text-purple-600" : "text-gray-700"
                  }`}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pattern Blocks */}
        {blocks.map((block, blockIdx) => (
          <View
            key={blockIdx}
            className="mb-4 rounded-xl bg-white p-4 shadow-sm"
          >
            <TextInput
              className="mb-3 rounded-lg border border-gray-300 px-3 py-2 text-base font-semibold"
              value={block.name}
              onChangeText={(text) => {
                const newBlocks = [...blocks];
                const block = newBlocks[blockIdx];
                if (block) block.name = text;
                setBlocks(newBlocks);
              }}
            />

            {block.rows.map((row, rowIdx) => (
              <View key={rowIdx} className="mb-3 rounded-lg bg-gray-50 p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-gray-700">
                    Row {row.rowNumber} - {row.side}
                  </Text>
                  <TouchableOpacity
                    className={`rounded px-3 py-1 ${
                      row.stitchChangeType !== "none"
                        ? "bg-amber-100"
                        : "bg-gray-200"
                    }`}
                    onPress={() => {
                      const nextType =
                        row.stitchChangeType === "none"
                          ? "increase"
                          : row.stitchChangeType === "increase"
                            ? "decrease"
                            : "none";
                      updateRow(blockIdx, rowIdx, "stitchChangeType", nextType);
                    }}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        row.stitchChangeType !== "none"
                          ? "text-amber-700"
                          : "text-gray-600"
                      }`}
                    >
                      {row.stitchChangeType === "increase"
                        ? "Increase"
                        : row.stitchChangeType === "decrease"
                          ? "Decrease"
                          : "Normal"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  className="mb-2 rounded border border-gray-300 bg-white px-2 py-2 text-sm"
                  value={row.instruction}
                  onChangeText={(text) =>
                    updateRow(blockIdx, rowIdx, "instruction", text)
                  }
                  placeholder="Knit to last 3 sts, slip 3 purl-wise"
                  multiline
                />

                {row.stitchChangeType !== "none" && (
                  <TextInput
                    className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs"
                    value={row.specialActionNote}
                    onChangeText={(text) =>
                      updateRow(blockIdx, rowIdx, "specialActionNote", text)
                    }
                    placeholder="Special action (e.g., kfb)"
                  />
                )}
              </View>
            ))}

            <TouchableOpacity
              className="mb-3 rounded-lg border border-dashed border-gray-400 bg-gray-50 py-2"
              onPress={() => addRow(blockIdx)}
            >
              <Text className="text-center text-sm font-medium text-gray-600">
                + Add Row
              </Text>
            </TouchableOpacity>

            <View className="mt-2 rounded-lg bg-blue-50 p-3">
              <Text className="mb-2 text-xs font-medium text-blue-900">
                Repeat Settings
              </Text>
              <View className="flex-row space-x-2">
                {(["none", "block", "rows"] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    className={`flex-1 rounded py-1 ${
                      block.repeatType === type ? "bg-blue-600" : "bg-blue-200"
                    }`}
                    onPress={() => {
                      const newBlocks = [...blocks];
                      const block = newBlocks[blockIdx];
                      if (block) block.repeatType = type;
                      setBlocks(newBlocks);
                    }}
                  >
                    <Text
                      className={`text-center text-xs font-medium capitalize ${
                        block.repeatType === type
                          ? "text-white"
                          : "text-blue-900"
                      }`}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity
          className="mb-4 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 py-3"
          onPress={addBlock}
        >
          <Text className="text-center text-base font-semibold text-purple-600">
            + Add Block
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="mb-8 rounded-xl bg-purple-600 py-4 shadow-lg"
          onPress={savePattern}
        >
          <Text className="text-center text-base font-bold text-white">
            Save Pattern & Create Project
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
