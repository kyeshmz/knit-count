import { ConfigPlugin, withEntitlementsPlist } from "@expo/config-plugins";

const APP_GROUP = "group.com.knitcount.app";

/**
 * Add App Groups entitlement to main app for Live Activity shared state
 */
const withInteractiveLiveActivity: ConfigPlugin = (config) => {
  return withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.security.application-groups"] = [APP_GROUP];
    return config;
  });
};

export default withInteractiveLiveActivity;
