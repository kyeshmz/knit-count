import { openDatabaseAsync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";

import * as schema from "./schema";

let dbInstance: any = null;
let expoDbInstance: any = null;

export async function getDatabase() {
  if (!dbInstance) {
    expoDbInstance = await openDatabaseAsync("knit.db");
    dbInstance = drizzle(expoDbInstance, { schema });
  }
  return dbInstance;
}

export async function getExpoDatabase() {
  if (!expoDbInstance) {
    expoDbInstance = await openDatabaseAsync("knit.db");
  }
  return expoDbInstance;
}

export type Database = Awaited<ReturnType<typeof getDatabase>>;
