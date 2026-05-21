const isProductionBuild =
  process.env.NODE_ENV === "production" ||
  ["preview", "production"].includes(process.env.EAS_BUILD_PROFILE || "");

const excludedInProduction = isProductionBuild
  ? {
      "expo-dev-client": { platforms: { android: null, ios: null } },
      "expo-dev-launcher": { platforms: { android: null, ios: null } },
      "expo-dev-menu": { platforms: { android: null, ios: null } },
      "expo-dev-menu-interface": { platforms: { android: null, ios: null } },
    }
  : {};

module.exports = {
  dependencies: excludedInProduction,
};
