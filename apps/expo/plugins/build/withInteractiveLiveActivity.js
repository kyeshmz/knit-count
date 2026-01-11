"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const APP_GROUP = "group.com.knitcount.app";
/**
 * Add App Groups entitlement to main app for Live Activity shared state
 */
const withInteractiveLiveActivity = (config) => {
    return (0, config_plugins_1.withEntitlementsPlist)(config, (config) => {
        config.modResults["com.apple.security.application-groups"] = [APP_GROUP];
        return config;
    });
};
exports.default = withInteractiveLiveActivity;
