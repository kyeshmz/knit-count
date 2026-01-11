import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { router, Stack } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

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

const adjectives = [
  "Cozy",
  "Warm",
  "Soft",
  "Snug",
  "Cute",
  "Lucky",
  "Happy",
  "Sweet",
  "Lovely",
  "Fuzzy",
];
const nouns = [
  "Knit",
  "Stitch",
  "Yarn",
  "Wool",
  "Blanket",
  "Scarf",
  "Sweater",
  "Creation",
  "Project",
  "Masterpiece",
];

const generateRandomTitle = () => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
};

// Schema for AI description input
const aiDescriptionSchema = z.object({
  description: z.string().optional(),
});

// Schema for project details
const projectDetailsSchema = z.object({
  projectName: z.string().optional(),
  patternName: z.string().min(1, "Pattern name is required"),
  size: z.enum(["small", "medium", "large"]),
});

type AIDescriptionForm = z.infer<typeof aiDescriptionSchema>;
type ProjectDetailsForm = z.infer<typeof projectDetailsSchema>;

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

export default function CreateProjectPage() {
  const { db } = useDatabase();
  const trpc = useTRPC();
  const [step, setStep] = useState<1 | 2>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTextBoxExpanded, setIsTextBoxExpanded] = useState(false);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<BlockForm[]>([
    {
      name: "Block 1",
      rows: [
        {
          rowNumber: 1,
          side: "RS",
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

  const step1Form = useForm<AIDescriptionForm>({
    resolver: zodResolver(aiDescriptionSchema),
    defaultValues: { description: "" },
  });

  const step2Form = useForm<ProjectDetailsForm>({
    resolver: zodResolver(projectDetailsSchema),
    defaultValues: {
      projectName: generateRandomTitle(),
      patternName: "",
      size: "medium",
    },
  });

  const parsePatternMutation = useMutation(
    trpc.pattern.parsePattern.mutationOptions(),
  );

  const handleStep1Submit = async (data: AIDescriptionForm) => {
    Keyboard.dismiss();

    if (data.description?.trim()) {
      // Use AI to parse the pattern
      setIsGenerating(true);
      try {
        const result = await parsePatternMutation.mutateAsync({
          instructions: data.description,
        });

        // Update form with AI results
        step2Form.setValue("patternName", result.patternName);

        // Convert AI blocks to our format
        setBlocks(
          result.blocks.map((block) => ({
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

        setIsGenerating(false);
        setStep(2);
      } catch {
        setIsGenerating(false);
        Alert.alert(
          "AI Generation Failed",
          "Could not parse pattern. You can continue manually.",
        );
        setStep(2);
      }
    } else {
      // Skip AI, go to manual entry
      setStep(2);
    }
  };

  const handleSkip = () => {
    Keyboard.dismiss();
    setStep(2);
  };

  const handlePickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        if (file) {
          setPdfFile(file.uri);
        }
      }
    } catch (error) {
      console.error("Error picking PDF:", error);
      Alert.alert("Error", "Could not select PDF file");
    }
  };

  const handleRemovePdf = () => {
    setPdfFile(null);
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

  const addBlock = () => {
    setBlocks([
      ...blocks,
      {
        name: `Block ${blocks.length + 1}`,
        rows: [
          {
            rowNumber: 1,
            side: "RS",
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

  const updateRow = (
    blockIndex: number,
    rowIndex: number,
    field: keyof RowForm,
    value: string | number,
  ) => {
    const newBlocks = [...blocks];
    const block = newBlocks[blockIndex];
    if (!block) return;
    const row = block.rows[rowIndex];
    if (!row) return;
    if (field === "instruction" || field === "specialActionNote") {
      row[field] = value as string;
    } else if (field === "side") {
      row[field] = value as "WS" | "RS";
    } else if (field === "stitchChangeType") {
      row[field] = value as "increase" | "decrease" | "none";
    } else {
      row[field] = value as number;
    }
    setBlocks(newBlocks);
  };

  const handleSave = (data: ProjectDetailsForm) => {
    try {
      // Create pattern
      const patternResult = db
        .insert(patterns)
        .values({
          name: data.patternName.trim(),
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .run();

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
          name: data.projectName?.trim() || generateRandomTitle(),
          description: null,
          selectedSize: data.size,
          pdfUrl: pdfFile || null,
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

      router.push(`/counter/${projectId}`);
    } catch (error) {
      console.error("Error saving pattern:", error);
      Alert.alert("Error", "Failed to save pattern");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
    >
      <Stack.Screen
        options={{
          title: step === 1 ? "New Project" : "Project Details",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-base text-purple-600">Cancel</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <View className="px-8 pb-8 pt-6">
            <Text className="mb-2 text-2xl font-bold text-gray-900">
              New Project
            </Text>
            <Text className="mb-4 text-sm text-gray-600">
              Paste your knitting instructions for AI to analyze, or skip to
              enter manually.
            </Text>

            <TouchableOpacity
              onPress={() => setIsTextBoxExpanded(!isTextBoxExpanded)}
              className="mb-2"
            >
              <View className="flex-row items-center justify-between rounded-t-xl border border-b-0 border-gray-300 bg-gray-100 px-3 py-2">
                <Text className="text-sm font-medium text-gray-700">
                  AI Pattern Instructions
                </Text>
                <Text className="text-xs text-gray-500">
                  {isTextBoxExpanded ? "Tap to collapse ▲" : "Tap to expand ▼"}
                </Text>
              </View>
            </TouchableOpacity>

            <Controller
              control={step1Form.control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className={`mb-4 rounded-b-xl border border-gray-300 bg-gray-50 p-3 text-base ${
                    isTextBoxExpanded ? "min-h-[300px]" : "min-h-[100px]"
                  }`}
                  style={{
                    maxHeight: isTextBoxExpanded ? 300 : 100,
                  }}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Paste knitting pattern instructions here...

Example:
Row 1 (WS): Knit to last 3 sts, slip 3 purl-wise wyif.
Row 2 (RS): Same as Row 1.
Repeat Rows 1-2 three times."
                  multiline
                  textAlignVertical="top"
                  scrollEnabled={true}
                />
              )}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 rounded-xl border border-gray-300 bg-white py-3"
                onPress={handleSkip}
              >
                <Text className="text-center font-semibold text-gray-700">
                  Skip
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center rounded-xl bg-purple-600 py-3"
                onPress={step1Form.handleSubmit(handleStep1Submit)}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                ) : null}
                <Text className="font-semibold text-white">
                  {isGenerating ? "Analyzing..." : "Continue"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="px-8 pb-8 pt-6">
            <Text className="mb-4 text-2xl font-bold text-gray-900">
              Project Details
            </Text>

            {/* Project Name */}
            <View className="mb-4">
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Project Name
              </Text>
              <Controller
                control={step2Form.control}
                name="projectName"
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => (
                  <>
                    <TextInput
                      className={`rounded-xl border bg-white px-4 py-3 text-base ${
                        error ? "border-red-500" : "border-gray-300"
                      }`}
                      value={value}
                      onChangeText={onChange}
                      onFocus={() => {
                        if (
                          value?.includes("Cozy") ||
                          value?.includes("Warm") ||
                          value?.includes("Soft") ||
                          value?.includes("Snug") ||
                          value?.includes("Cute") ||
                          value?.includes("Lucky") ||
                          value?.includes("Happy") ||
                          value?.includes("Sweet") ||
                          value?.includes("Lovely") ||
                          value?.includes("Fuzzy")
                        ) {
                          onChange("");
                        }
                      }}
                      placeholder="My Cozy Sweater"
                    />
                    {error && (
                      <Text className="mt-1 text-xs text-red-500">
                        {error.message}
                      </Text>
                    )}
                  </>
                )}
              />
            </View>

            {/* Pattern Name */}
            <View className="mb-4">
              <Text className="mb-1 text-sm font-medium text-gray-700">
                Pattern Name *
              </Text>
              <Controller
                control={step2Form.control}
                name="patternName"
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => (
                  <>
                    <TextInput
                      className={`rounded-xl border bg-white px-4 py-3 text-base ${
                        error ? "border-red-500" : "border-gray-300"
                      }`}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Scarf Pattern"
                    />
                    {error && (
                      <Text className="mt-1 text-xs text-red-500">
                        {error.message}
                      </Text>
                    )}
                  </>
                )}
              />
            </View>

            {/* PDF Attachment */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-gray-700">
                Pattern PDF (Optional)
              </Text>
              {pdfFile ? (
                <View className="flex-row items-center justify-between rounded-xl border border-purple-300 bg-purple-50 px-4 py-3">
                  <View className="flex-1 flex-row items-center">
                    <AntDesign name="file-text" size={20} color="#9333ea" />
                    <Text className="ml-2 flex-1 text-sm font-medium text-purple-700">
                      {pdfFile.split("/").pop() || "PDF attached"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleRemovePdf}
                    className="ml-2 rounded-full bg-red-100 p-2"
                  >
                    <AntDesign name="close" size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handlePickPdf}
                  className="flex-row items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-4"
                >
                  <AntDesign name="plus" size={20} color="#9ca3af" />
                  <Text className="ml-2 text-sm font-medium text-gray-600">
                    Attach Pattern PDF
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Size Selection */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-gray-700">
                Size
              </Text>
              <Controller
                control={step2Form.control}
                name="size"
                render={({ field: { onChange, value } }) => (
                  <View className="flex-row gap-2">
                    {(["small", "medium", "large"] as const).map((size) => (
                      <TouchableOpacity
                        key={size}
                        className={`flex-1 rounded-xl border-2 py-3 ${
                          value === size
                            ? "border-purple-600 bg-purple-50"
                            : "border-gray-300 bg-white"
                        }`}
                        onPress={() => onChange(size)}
                      >
                        <Text
                          className={`text-center font-medium capitalize ${
                            value === size ? "text-purple-600" : "text-gray-700"
                          }`}
                        >
                          {size}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            </View>

            {/* Pattern Blocks */}
            <Text className="mb-2 mt-4 text-lg font-semibold text-gray-900">
              Pattern Sections
            </Text>

            {blocks.map((block, blockIdx) => (
              <View key={blockIdx} className="mb-4 rounded-xl bg-gray-50 p-4">
                <TextInput
                  className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base font-semibold"
                  value={block.name}
                  onChangeText={(text) => {
                    const newBlocks = [...blocks];
                    const block = newBlocks[blockIdx];
                    if (block) block.name = text;
                    setBlocks(newBlocks);
                  }}
                  placeholder="Section Name"
                />

                {block.rows.map((row, rowIdx) => (
                  <View key={rowIdx} className="mb-2 rounded-lg bg-white p-3">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-sm font-medium text-gray-700">
                        Row {row.rowNumber} ({row.side})
                      </Text>
                      <TouchableOpacity
                        className={`rounded px-2 py-1 ${
                          row.stitchChangeType !== "none"
                            ? "bg-amber-100"
                            : "bg-gray-100"
                        }`}
                        onPress={() => {
                          const nextType =
                            row.stitchChangeType === "none"
                              ? "increase"
                              : row.stitchChangeType === "increase"
                                ? "decrease"
                                : "none";
                          updateRow(
                            blockIdx,
                            rowIdx,
                            "stitchChangeType",
                            nextType,
                          );
                        }}
                      >
                        <Text className="text-xs font-medium text-gray-600">
                          {row.stitchChangeType === "increase"
                            ? "+Inc"
                            : row.stitchChangeType === "decrease"
                              ? "-Dec"
                              : "Normal"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      className="rounded border border-gray-200 bg-gray-50 px-2 py-2 text-sm"
                      value={row.instruction}
                      onChangeText={(text) =>
                        updateRow(blockIdx, rowIdx, "instruction", text)
                      }
                      placeholder="Knit to last 3 sts, slip 3 purl-wise"
                      multiline
                    />
                  </View>
                ))}

                <TouchableOpacity
                  className="rounded-lg border border-dashed border-gray-400 py-2"
                  onPress={() => addRow(blockIdx)}
                >
                  <Text className="text-center text-sm font-medium text-gray-600">
                    + Add Row
                  </Text>
                </TouchableOpacity>

                {/* Repeat Settings */}
                <View className="mt-3 rounded-lg bg-blue-50 p-2">
                  <Text className="mb-2 text-xs font-medium text-blue-900">
                    Repeat
                  </Text>
                  <View className="flex-row gap-1">
                    {(["none", "block", "rows"] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        className={`flex-1 rounded py-1 ${
                          block.repeatType === type
                            ? "bg-blue-600"
                            : "bg-blue-200"
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
              <Text className="text-center font-semibold text-purple-600">
                + Add Section
              </Text>
            </TouchableOpacity>

            {/* Save Button */}
            <TouchableOpacity
              className="mb-8 rounded-xl bg-purple-600 py-4"
              onPress={step2Form.handleSubmit(handleSave)}
            >
              <Text className="text-center text-base font-bold text-white">
                Create Project
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
