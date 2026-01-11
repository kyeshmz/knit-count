import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";

import { db } from "@acme/db/client";

export function initAuth<
  TExtraPlugins extends BetterAuthPlugin[] = [],
>(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;
  googleClientId?: string;
  googleClientSecret?: string;
  appleClientId?: string;
  appleClientSecret?: string;
  extraPlugins?: TExtraPlugins;
}) {
  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    socialProviders: {
      google:
        options.googleClientId && options.googleClientSecret
          ? {
              clientId: options.googleClientId,
              clientSecret: options.googleClientSecret,
            }
          : undefined,
      apple:
        options.appleClientId && options.appleClientSecret
          ? {
              clientId: options.appleClientId,
              clientSecret: options.appleClientSecret,
            }
          : undefined,
    },
    plugins: [
      oAuthProxy({
        productionURL: options.productionUrl,
      }),
      expo(),
      ...(options.extraPlugins ?? []),
    ],
    trustedOrigins: ["expo://"],
    onAPIError: {
      onError(error, ctx) {
        console.error("BETTER AUTH API ERROR", error, ctx);
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
