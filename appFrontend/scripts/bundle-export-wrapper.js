#!/usr/bin/env node
/**
 * Wrapper for "expo export:embed" for Android release builds.
 * - Forwards all Gradle args (--bundle-output, --assets-dest, etc.) to expo export:embed.
 * - Does NOT change cwd so Gradle's workingDir (project root) is preserved; the bundle
 *   is written where Hermes will read it (same relative path), fixing "Failed to open file" on Windows.
 * - Creates output dirs so the bundler can write; normalizes path args to forward slashes for Windows CLI tools.
 * Set PROJECT_ROOT in the task only if you need to force a canonical root (e.g. junction paths); then uncomment chdir below.
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

// Local ./gradlew bundleRelease often runs without NODE_ENV; app.config.ts then treats the build as
// non-production (skips production autolinking / can skew embed). Match EAS production behavior.
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Keep Gradle's workingDir so bundle and Hermes use the same path resolution (critical on Windows).
const projectRoot = process.env.PROJECT_ROOT;
// if (projectRoot) process.chdir(path.resolve(projectRoot));  // Uncomment only if you need canonical root (e.g. junction paths)
const resolveCwd = process.cwd();

// Gradle passes: bundleCommand then --bundle-output, --assets-dest, --sourcemap-output, etc.
// On Windows/AGP 7.1+, "Failed to open file" can refer to generated/assets/createBundleReleaseJsAndAssets/.
// Write the bundle there first, then copy to react/Release so the plugin's Hermes step (which uses react/Release) finds it too.
const rawArgs = process.argv.slice(2);
const pathFlags = new Set(['--bundle-output', '--assets-dest', '--sourcemap-output']);
const args = [];
let bundleOutputValue = null;
let bundleOutputResolved = null;
for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  args.push(arg);
  if (pathFlags.has(arg) && i + 1 < rawArgs.length) {
    let value = rawArgs[++i];
    const normalized = value.replace(/\//g, path.sep);
    const isBundleOutput = arg === '--bundle-output';
    if (isBundleOutput && (normalized.includes('react' + path.sep + 'Release') || normalized.includes('react/Release'))) {
      bundleOutputValue = value;
      value = value.replace(/react[\/\\]Release/g, 'createBundleReleaseJsAndAssets');
    }
    const resolvedPath = path.isAbsolute(value) ? value : path.resolve(resolveCwd, value);
    const resolvedDir = path.dirname(resolvedPath);
    if (!fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true });
    }
    if (isBundleOutput) bundleOutputResolved = resolvedPath;
    args.push(value.replace(/\\/g, '/'));
  }
}

const expoCli = require.resolve('expo/bin/cli', { paths: [resolveCwd, __dirname] });
const expoArgs = args[0] === 'export:embed'
  ? args
  : ['export:embed', '--platform', 'android', ...args];
execFileSync(process.execPath, [expoCli, ...expoArgs], { stdio: 'inherit' });

// Plugin's Hermes step reads from react/Release (jsBundleDir). Copy bundle there so hermesc finds it.
if (bundleOutputResolved && fs.existsSync(bundleOutputResolved) && bundleOutputValue) {
  const reactReleaseResolved = path.isAbsolute(bundleOutputValue)
    ? bundleOutputValue
    : path.resolve(resolveCwd, bundleOutputValue);
  if (reactReleaseResolved !== bundleOutputResolved) {
    fs.mkdirSync(path.dirname(reactReleaseResolved), { recursive: true });
    fs.copyFileSync(bundleOutputResolved, reactReleaseResolved);
  }
}
