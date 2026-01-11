import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

// For Cloudflare Workers D1
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema, casing: "snake_case" });
}

export type Database = ReturnType<typeof createDb>;
