import { patternRouter } from "./router/pattern";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  pattern: patternRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
