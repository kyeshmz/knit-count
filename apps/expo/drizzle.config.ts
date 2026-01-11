import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/drizzle/schema.ts",
  out: "./src/lib/drizzle/migrations",
  dialect: "sqlite",
  driver: "expo",
});
