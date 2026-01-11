#!/usr/bin/env npx tsx
/**
 * Copies custom Live Activity Swift templates to the iOS project.
 * Run this after `expo prebuild` to override expo-live-activity defaults.
 */
import * as fs from "fs";
import * as path from "path";

const APP_GROUP = "group.com.knitcount.app";

const projectRoot = path.resolve(__dirname, "..");
const templatesDir = path.join(projectRoot, "templates", "live-activity");
const liveActivityDir = path.join(projectRoot, "ios", "LiveActivity");

function copyTemplate(filename: string): void {
  const templatePath = path.join(templatesDir, filename);
  const destPath = path.join(liveActivityDir, filename);

  let content = fs.readFileSync(templatePath, "utf8");
  content = content.replace(/\{\{APP_GROUP\}\}/g, APP_GROUP);

  fs.writeFileSync(destPath, content);
  console.log(`✓ Copied ${filename}`);
}

// Ensure directory exists
if (!fs.existsSync(liveActivityDir)) {
  console.error("Error: ios/LiveActivity directory not found. Run expo prebuild first.");
  process.exit(1);
}

// Copy templates
copyTemplate("LiveActivityView.swift");
copyTemplate("LiveActivityWidget.swift");
copyTemplate("LiveActivity.entitlements");

console.log("\n✅ Live Activity templates copied successfully!");
