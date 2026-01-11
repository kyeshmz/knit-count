#!/usr/bin/env node
/**
 * Test script for AI pattern parser
 * Tests the tRPC pattern.parsePattern endpoint
 *
 * Usage:
 * pnpm test:ai
 */
import "dotenv/config";

import type { inferRouterContext } from "@trpc/server";

import { appRouter } from "./src/root";

type RouterContext = inferRouterContext<typeof appRouter>;

const SAMPLE_INSTRUCTIONS = `
The Sophie Hood is worked in one piece from tip to tip. Cast on 6 sts on a 5 mm circular needle. The first row is a WS row.
Work as follows:
Row 1 (WS): Knit to the last 3 sts on the needle, slip the last 3 sts purl-wise wyif.
Row 2 (RS): Work as Row 1.
Work Rows 1 and 2 a total of 3 times (for a total of 6 rows). The next row is a WS row.

Now work increases from the WS on every 6th (8th) 10th row as follows:
Row 1 (WS): K2, kfb, knit to the last 3 sts on the needle, slip the last 3 sts purl-wise wyif.
Row 2 (RS): Knit to the last 3 sts on the needle, slip the last 3 sts purl-wise wyif.
Row 3 (WS): Work as Row 2.
Row 4 (RS): Work as Row 2.
Work Rows 1-4 once, then work Rows 3 and 4 another 1 (2) 3 times (for a total of 6 (8) 10 rows).

Now work decreases on every 4th row to shape the hood as follows:
Row 1 (RS): Knit to the last 3 sts on the needle, k2tog, k1.
Row 2 (WS): Knit to the last 3 sts on the needle, slip the last 3 sts purl-wise wyif.
Row 3 (RS): Knit across.
Row 4 (WS): Work as Row 2.
Work Rows 1-4 a total of 3 times.

Now work decreases every 2nd row as follows:
Row 1 (RS): Knit to the last 3 sts on the needle, k2tog, k1.
Row 2 (WS): Knit to the last 3 sts on the needle, slip the last 3 sts purl-wise wyif.
Work Rows 1 and 2 a total of 6 times.
`;

async function testAIParser() {
  console.log("🧶 Testing AI Pattern Parser\n");
  console.log("Sample instructions:");
  console.log(SAMPLE_INSTRUCTIONS);
  console.log("\n" + "=".repeat(60) + "\n");

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  // Create a mock D1 database instance (we won't actually use it for this test)
  const mockDb = {
    prepare: () => ({
      bind: () => ({ all: async () => ({ results: [] }) }),
      run: async () => ({ success: true }),
      first: async () => null,
    }),
    batch: async () => [],
    dump: async () => new ArrayBuffer(0),
    exec: async () => ({ count: 0, duration: 0 }),
  } as any;

  // Mock createDb to return the mock
  const db = {
    query: {},
    select: () => ({
      from: () => ({ where: () => ({ all: async () => [] }) }),
    }),
    insert: () => ({ values: () => ({}) }),
    delete: () => ({ where: () => ({}) }),
    update: () => ({ set: () => ({ where: () => ({}) }) }),
  } as any;

  // Create context
  const ctx: RouterContext = {
    db,
    env: {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      NODE_ENV: "development",
    },
  };

  console.log("📡 Calling tRPC pattern.parsePattern endpoint...\n");

  try {
    // Call the mutation directly
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pattern.parsePattern({
      instructions: SAMPLE_INSTRUCTIONS,
    });

    console.log("✅ Success! Parsed pattern:\n");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n" + "=".repeat(60));
    console.log("\n📊 Summary:");
    console.log(`  Pattern Name: ${result.patternName}`);
    console.log(`  Number of Blocks: ${result.blocks.length}`);
    result.blocks.forEach((block, idx) => {
      console.log(`\n  Block ${idx + 1}: ${block.name}`);
      console.log(`    Rows: ${block.rows.length}`);
      console.log(`    Repeats: ${block.repeats.length}`);

      const increaseRows = block.rows.filter(
        (r) => r.stitchChangeType === "increase",
      );
      const decreaseRows = block.rows.filter(
        (r) => r.stitchChangeType === "decrease",
      );

      if (increaseRows.length > 0) {
        console.log(`    Increase rows: ${increaseRows.length}`);
      }
      if (decreaseRows.length > 0) {
        console.log(`    Decrease rows: ${decreaseRows.length}`);
      }
    });

    console.log("\n✨ Test passed!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testAIParser().catch(console.error);
