import { useEffect, useState } from "react";

import { getDatabase, getExpoDatabase } from "~/lib/drizzle/client";
import { runMigrations } from "~/lib/drizzle/migrations";

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [db, setDb] = useState<any>(null);

  useEffect(() => {
    async function setup() {
      try {
        const expoDb = await getExpoDatabase();
        await runMigrations(expoDb);
        const database = await getDatabase();
        setDb(database);
        setIsReady(true);
      } catch (error) {
        console.error("Database setup error:", error);
      }
    }

    void setup();
  }, []);

  return { db, isReady };
}
