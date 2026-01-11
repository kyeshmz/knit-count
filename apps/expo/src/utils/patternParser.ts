/**
 * Pattern Parser Utility
 * Calls OpenRouter API to parse knitting instructions into structured data
 */

export interface ParsedPattern {
  patternName: string;
  blocks: {
    name: string;
    rows: {
      rowNumber: number;
      side: "WS" | "RS";
      instruction: string;
      stitchChangeType: "increase" | "decrease" | "none";
      specialActionNote: string;
      stitchChangeAmount: number;
    }[];
    repeats: {
      repeatType: "none" | "block" | "rows";
      timesToRepeat: number;
      startRowNumber: number;
      endRowNumber: number;
      sizeVariations: {
        small: number;
        medium: number;
        large: number;
      };
    }[];
  }[];
}

/**
 * Preprocesses knitting pattern text to normalize formatting
 */
function preprocessPattern(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const normalized: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }
    const rowMatch = /^Row\s+\d+\s+\((WS|RS)\):\s*(.*)$/.exec(line);

    if (rowMatch) {
      const instruction = rowMatch[2]?.trim() ?? "";
      if (instruction.length === 0 && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine && !/^Row\s+\d+/.exec(nextLine)) {
          normalized.push(line + " " + nextLine);
          i += 2;
          continue;
        }
      }
    }
    normalized.push(line);
    i++;
  }
  return normalized.join("\n");
}

/**
 * Parse knitting instructions using OpenRouter API
 */
export async function parseKnittingPattern(
  instructions: string,
  apiKey: string,
): Promise<ParsedPattern> {
  if (!apiKey) {
    throw new Error("OpenRouter API key not configured");
  }

  const processedInstructions = preprocessPattern(instructions);

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://knit-count.app",
        "X-Title": "Knit Count App",
      },
      body: JSON.stringify({
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
- Divide the pattern into logical blocks based on these triggers:
  1. Major section headers (e.g., "Scarf", "Right Side of Hood", "Left Side of Hood")
  2. "Work as follows:" - starts a new section block
  3. "Now work [description] as follows:" - starts a new section block
  4. Any instruction like "Work Rows X and Y a total of N times" completes the current section
- Each block should be named descriptively based on the context (e.g., "Setup Rows", "Increase Section", "Work Increases")
- Track which rows are base instructions vs. which are repeats
- For "Work Rows 1-4 once, then work Rows 3 and 4 another 2 times" - this means rows 1,2,3,4,3,4,3,4
- When pattern says "Work as Row 2", extract the actual instruction from Row 2`,
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
                            },
                            specialActionNote: { type: "string" },
                            stitchChangeAmount: { type: "number" },
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
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenRouter API");
  }

  return JSON.parse(content) as ParsedPattern;
}
