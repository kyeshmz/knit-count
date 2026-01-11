/**
 * Cloudflare Workers entry point for tRPC API with Hono
 */
import type { D1Database } from "@cloudflare/workers-types";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { createDb } from "@acme/db/client";

import { appRouter } from "./root";
import { createTRPCContext } from "./trpc";

export interface Env {
  DB: D1Database;
  NODE_ENV?: string;
  OPENROUTER_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for all routes
app.use("/*", cors());

// Health check endpoint
app.get("/", (c) => {
  return c.json({ status: "ok", message: "tRPC API with Hono" });
});

// tRPC endpoint
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: async (opts, c) => {
      const db = createDb(c.env.DB);
      return createTRPCContext({
        headers: opts.req.headers,
        db,
        env: {
          OPENROUTER_API_KEY: c.env.OPENROUTER_API_KEY,
          NODE_ENV: c.env.NODE_ENV,
        },
      });
    },
    onError: ({ path, error }) => {
      // Error logging in development mode
      if (process.env.NODE_ENV === "development") {
        console.error(
          `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
        );
      }
    },
  }),
);

export default app;
