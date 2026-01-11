const { withXcodeProject, withEntitlementsPlist } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const APP_GROUP = "group.com.knitcount.app";

// Add App Groups to main app entitlements
const withAppGroupsEntitlements = (config) => {
  return withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.security.application-groups"] = [APP_GROUP];
    return config;
  });
};

// Add App Groups to LiveActivity extension
const withLiveActivityAppGroups = (config) => {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectRoot = config.modRequest.projectRoot;

    // Path to LiveActivity entitlements
    const liveActivityEntitlementsPath = path.join(
      projectRoot,
      "ios",
      "LiveActivity",
      "LiveActivity.entitlements"
    );

    // Create entitlements content with App Groups
    const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.application-groups</key>
    <array>
      <string>${APP_GROUP}</string>
    </array>
  </dict>
</plist>
`;

    // Ensure the directory exists
    const dir = path.dirname(liveActivityEntitlementsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the entitlements file
    fs.writeFileSync(liveActivityEntitlementsPath, entitlementsContent);
    console.log("[withAppGroups] Added App Groups to LiveActivity entitlements");

    return config;
  });
};

module.exports = (config) => {
  config = withAppGroupsEntitlements(config);
  config = withLiveActivityAppGroups(config);
  return config;
};
