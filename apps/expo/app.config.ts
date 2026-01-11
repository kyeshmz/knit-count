import type { ConfigContext, ExpoConfig } from "expo/config";

const BUNDLE_ID = "com.knitcount.app";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Knit Count",
  slug: "knit-count",
  scheme: "knitcount",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon-light.png",
  userInterfaceStyle: "automatic",
  updates: {
    fallbackToCacheTimeout: 0,
  },
  newArchEnabled: true,
  assetBundlePatterns: ["**/*"],
  ios: {
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSSupportsLiveActivities: true,
      NSSupportsLiveActivitiesFrequentUpdates: true,
    },
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: true,
    icon: {
      light: "./assets/icon-light.png",
      dark: "./assets/icon-dark.png",
    },
    entitlements: {
      "com.apple.security.application-groups": [`group.${BUNDLE_ID}`],
    },
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      foregroundImage: "./assets/icon-light.png",
      backgroundColor: "#1F104A",
    },
    edgeToEdgeEnabled: true,
  },
  extra: {
    eas: {
      projectId: "ff42f55d-414e-4bf1-aa4b-48c8b63ad48e",
    },
  },
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true,
    // Disabled for EAS build stability - these are experimental
    // reactCanary: true,
    // reactCompiler: true,
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-live-activity",
      {
        // Explicitly configure the Live Activity plugin
        // enablePushNotifications: true, // Enable if you need push-based updates
      },
    ],
    "./plugins/build/withInteractiveLiveActivity.js",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#E4E4E7",
        image: "./assets/icon-light.png",
        dark: {
          backgroundColor: "#18181B",
          image: "./assets/icon-dark.png",
        },
      },
    ],
  ],
});
