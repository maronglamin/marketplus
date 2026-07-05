#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, contents) {
  fs.writeFileSync(filePath, contents, "utf8");
}

function ensureTextFile(relativePath, contents) {
  const filePath = path.join(root, relativePath);
  if (fs.existsSync(filePath)) {
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  writeText(filePath, contents);
  console.log(`Created ${relativePath}`);
}

function replaceOnce(contents, from, to, label) {
  if (contents.includes(to)) {
    return contents;
  }
  if (!contents.includes(from)) {
    throw new Error(`Could not find expected snippet for ${label}`);
  }
  return contents.replace(from, to);
}

function patchFile(relativePath, transform) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    return;
  }
  const before = readText(filePath);
  const after = transform(before);
  if (after !== before) {
    writeText(filePath, after);
    console.log(`Patched ${relativePath}`);
  }
}

ensureTextFile(
  "node_modules/expo-notifications/android/src/main/res/values/strings.xml",
  `<resources>
  <string name="expo_notifications_fallback_channel_name">Miscellaneous</string>
</resources>
`
);

if (process.platform !== "win32") {
  process.exit(0);
}

patchFile(
  "node_modules/react-native-reanimated/android/CMakeLists.txt",
  (contents) =>
    replaceOnce(
      contents,
      `cmake_minimum_required(VERSION 3.8)\n\nset(CMAKE_EXPORT_COMPILE_COMMANDS ON)`,
      `cmake_minimum_required(VERSION 3.8)\n\n# Windows builds can exceed Ninja/CMake object path limits in this project.\n# Lowering CMAKE_OBJECT_PATH_MAX makes CMake hash long object paths sooner.\nset(CMAKE_OBJECT_PATH_MAX 128)\n\nset(CMAKE_EXPORT_COMPILE_COMMANDS ON)`,
      "react-native-reanimated CMakeLists.txt"
    )
);

patchFile(
  "node_modules/react-native-screens/android/CMakeLists.txt",
  (contents) =>
    replaceOnce(
      contents,
      `cmake_minimum_required(VERSION 3.9.0)\n\nproject(rnscreens)`,
      `cmake_minimum_required(VERSION 3.9.0)\n\n# Windows builds can exceed Ninja/CMake object path limits in this project.\n# Lowering CMAKE_OBJECT_PATH_MAX makes CMake hash long object paths sooner.\nset(CMAKE_OBJECT_PATH_MAX 128)\n\nproject(rnscreens)`,
      "react-native-screens CMakeLists.txt"
    )
);

patchFile(
  "node_modules/react-native-reanimated/android/build.gradle",
  (contents) => {
    let next = replaceOnce(
      contents,
      `def customDownloadsDir = System.getenv("REACT_NATIVE_DOWNLOADS_DIR")`,
      `if (System.getProperty("os.name").toLowerCase().contains("windows")) {\n    buildDir = new File("C:/rnb-reanimated")\n}\ndef windowsNativeStagingDir = new File("C:/rns-reanimated")\n\ndef customDownloadsDir = System.getenv("REACT_NATIVE_DOWNLOADS_DIR")`,
      "react-native-reanimated buildDir override"
    );

    next = replaceOnce(
      next,
      `        cmake {\n            version = System.getenv("CMAKE_VERSION") ?: "3.22.1"\n            path "CMakeLists.txt"\n        }`,
      `        cmake {\n            version = System.getenv("CMAKE_VERSION") ?: "3.22.1"\n            if (System.getProperty("os.name").toLowerCase().contains("windows")) {\n                buildStagingDirectory windowsNativeStagingDir.absolutePath\n            }\n            path "CMakeLists.txt"\n        }`,
      "react-native-reanimated build staging override"
    );

    return next;
  }
);

patchFile(
  "node_modules/react-native-screens/android/build.gradle",
  (contents) => {
    let next = replaceOnce(
      contents,
      `apply plugin: 'com.android.library'\napply plugin: 'kotlin-android'\n\ndef reactNativeArchitectures() {`,
      `apply plugin: 'com.android.library'\napply plugin: 'kotlin-android'\n\nif (System.getProperty("os.name").toLowerCase().contains("windows")) {\n    buildDir = new File("C:/rnb-screens")\n}\ndef windowsNativeStagingDir = new File("C:/rns-screens")\n\ndef reactNativeArchitectures() {`,
      "react-native-screens buildDir override"
    );

    next = replaceOnce(
      next,
      `    externalNativeBuild {\n        cmake {\n            path "CMakeLists.txt"\n        }\n    }`,
      `    externalNativeBuild {\n        cmake {\n            if (System.getProperty("os.name").toLowerCase().contains("windows")) {\n                buildStagingDirectory windowsNativeStagingDir.absolutePath\n            }\n            path "CMakeLists.txt"\n        }\n    }`,
      "react-native-screens build staging override"
    );

    return next;
  }
);
