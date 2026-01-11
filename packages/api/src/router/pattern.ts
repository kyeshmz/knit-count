import type { TRPCRouterRecord } from "@trpc/server";
import OpenAI from "openai";
import { z } from "zod/v4";

import { publicProcedure } from "../trpc";

/**
 * Preprocesses knitting pattern text to normalize formatting
 * Handles multi-line row definitions and inconsistent spacing
 */
function preprocessPattern(text: string): string {
  // Split into lines and clean up
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const normalized: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Check if this line starts with "Row X (WS):" or "Row X (RS):"
    const rowMatch = line.match(/^Row\s+\d+\s+\((WS|RS)\):\s*(.*)$/);

    if (rowMatch) {
      const instruction = rowMatch[2]!.trim();

      // If instruction is empty or very short, check if next line continues it
      if (instruction.length === 0 && i + 1 < lines.length) {
        const nextLine = lines[i + 1]!;
        // If next line doesn't start with "Row", it's likely a continuation
        if (!nextLine.match(/^Row\s+\d+/)) {
          normalized.push(line + " " + nextLine);
          i += 2; // Skip both lines
          continue;
        }
      }
    }

    normalized.push(line);
    i++;
  }

  return normalized.join("\n");
}

export const patternRouter = {
  parsePattern: publicProcedure
    .input(
      z.object({
        instructions: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        console.error("Environment keys available:", Object.keys(ctx.env));
        throw new Error(
          `OPENROUTER_API_KEY not configured. Available env keys: ${Object.keys(ctx.env).join(", ")}`,
        );
      }

      const openai = new OpenAI({
        apiKey: ctx.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });

      // Preprocess the instructions to normalize formatting
      const processedInstructions = preprocessPattern(input.instructions);

      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o-2024-11-20",
        messages: [
          {
            role: "system",
            content: `You are a knitting pattern parser. Extract structured information from knitting instructions.

CRITICAL FORMATTING RULES:
1. Row definitions may span multiple lines - the row number/side is on one line, the instruction continues below
2. When you see "Row X (WS):" or "Row X (RS):" followed by another line of text, that text is the instruction for that row
3. Instructions like "Work as Row 2" or "Work Rows 1-4 once" are repeat directives, not new rows
4. "Work Rows X and Y a total of N times" means repeat those specific rows N times

STITCH OPERATIONS:
- Increases: kfb (knit front and back), m1, yo, kfb adds 1 stitch
- Decreases: k2tog, ssk, skp, p2tog - each removes 1 stitch (2 stitches become 1)
- When counting stitches: kfb = +1, k2tog = -1, skp = -1

PATTERN STRUCTURE:
- Divide the pattern into logical blocks (e.g., "Scarf", "Right Side of Hood", "Left Side of Hood")
- Track which rows are base instructions vs. which are repeats
- For "Work Rows 1-4 once, then work Rows 3 and 4 another 2 times" - this means rows 1,2,3,4,3,4,3,4
- When pattern says "Work as Row 2", extract the actual instruction from Row 2

MULTI-LINE ROW HANDLING:
Input may look like:
"Row 1 (WS): K2, kfb, knit to the last 3 sts on the needle, slip the last 3 sts purl-wise wyif.
Row 2 (RS): Knit to the last 3 sts on the needle, slip the last 3 sts purl-wise wyif."

Or may look like (split across lines):
"Row 1 (WS): Knit to the last 3 sts on the needle, k2tog, k1.
Row 2 (WS): Knit to the last 3 sts on the needle, slip the last 3 sts purl-wise wyif."

Both formats are valid - parse accordingly.`,
          },
          {
            role: "user",
            content: `Parse this knitting pattern. Note that row definitions may span multiple lines - combine them properly:\n\n${processedInstructions}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "knitting_pattern",
            strict: true,
            schema: {
              type: "object",
              properties: {
                patternName: { type: "string" },
                blocks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      rows: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            rowNumber: { type: "number" },
                            side: { type: "string", enum: ["WS", "RS"] },
                            instruction: { type: "string" },
                            stitchChangeType: {
                              type: "string",
                              enum: ["increase", "decrease", "none"],
                              description:
                                "Type of stitch change: increase (add stitches), decrease (remove stitches), or none",
                            },
                            specialActionNote: { type: "string" },
                            stitchChangeAmount: {
                              type: "number",
                              description:
                                "Number of stitches added (positive) or removed (negative)",
                            },
                          },
                          required: [
                            "rowNumber",
                            "side",
                            "instruction",
                            "stitchChangeType",
                            "specialActionNote",
                            "stitchChangeAmount",
                          ],
                          additionalProperties: false,
                        },
                      },
                      repeats: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            repeatType: {
                              type: "string",
                              enum: ["none", "block", "rows"],
                            },
                            timesToRepeat: { type: "number" },
                            startRowNumber: { type: "number" },
                            endRowNumber: { type: "number" },
                            sizeVariations: {
                              type: "object",
                              properties: {
                                small: { type: "number" },
                                medium: { type: "number" },
                                large: { type: "number" },
                              },
                              required: ["small", "medium", "large"],
                              additionalProperties: false,
                            },
                          },
                          required: [
                            "repeatType",
                            "timesToRepeat",
                            "startRowNumber",
                            "endRowNumber",
                            "sizeVariations",
                          ],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["name", "rows", "repeats"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["patternName", "blocks"],
              additionalProperties: false,
            },
          },
        },
      });

      const parsed = JSON.parse(
        completion.choices[0]?.message?.content ?? "{}",
      ) as {
        patternName: string;
        blocks: Array<{
          name: string;
          rows: Array<{
            rowNumber: number;
            side: string;
            instruction: string;
            stitchChangeType: string;
            specialActionNote: string;
            stitchChangeAmount: number;
          }>;
          repeats: Array<{
            repeatType: string;
            timesToRepeat: number;
            startRowNumber: number;
            endRowNumber: number;
            sizeVariations: {
              small: number;
              medium: number;
              large: number;
            };
          }>;
        }>;
      };

      return parsed;
    }),
} satisfies TRPCRouterRecord;
