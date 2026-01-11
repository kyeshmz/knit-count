import * as Crypto from "expo-crypto";

/**
 * Generate a UUID v4 compatible with React Native
 */
export function generateUUID(): string {
  return Crypto.randomUUID();
}
