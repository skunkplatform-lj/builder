const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const config = require("../build.js");

const rootDir = path.resolve(__dirname, "..");
const buildDirPath = path.resolve(rootDir, config.buildDir);
const mainScriptPath = path.resolve(rootDir, config.mainScript);

// 1. Verify Entry Script
if (!fs.existsSync(mainScriptPath)) {
  console.error(`[SkunkBuilder] Error: Main script "${config.mainScript}" not found at ${mainScriptPath}`);
  process.exit(1);
}

// 2. Map & Verify Target Platform
const platformMap = {
  win64: "win32",
  windows: "win32",
  win: "win32",
  linux64: "linux",
  linux: "linux",
  macos64: "darwin",
  macos: "darwin",
  mac: "darwin"
};

const currentPlatform = process.platform; // 'win32', 'linux', or 'darwin'
const allowedPlatforms = (config.platforms || []).map(p => platformMap[p.toLowerCase()] || p);

if (allowedPlatforms.length > 0 && !allowedPlatforms.includes(currentPlatform)) {
  console.log(`[SkunkBuilder] Skipping build on "${currentPlatform}". Target platforms configured:`, config.platforms);
  process.exit(0);
}

if (!fs.existsSync(buildDirPath)) {
  fs.mkdirSync(buildDirPath, { recursive: true });
}

// 3. Prepare SEA Blob
const blobPath = path.join(buildDirPath, "sea-prep.blob");
const seaConfigFile = path.join(buildDirPath, "sea-config.json");

const seaConfig = {
  main: mainScriptPath,
  output: blobPath,
  disableExperimentalSEAWarning: true
};

fs.writeFileSync(seaConfigFile, JSON.stringify(seaConfig, null, 2));

console.log(`[SkunkBuilder] Preparing blob for ${config.name} (${currentPlatform})...`);
execSync(`node --experimental-sea-config "${seaConfigFile}"`, { stdio: "inherit" });

// 4. Platform Injection Setup
const isWindows = currentPlatform === "win32";
const isMac = currentPlatform === "darwin";

const exeName = isWindows ? `${config.appname}.exe` : config.appname;
const outputExe = path.join(buildDirPath, exeName);
const nodeBinary = process.execPath;

console.log(`[SkunkBuilder] Creating base binary...`);
fs.copyFileSync(nodeBinary, outputExe);

let postjectMachoSegment = isMac ? "--macho-segment-name NODE_SEA" : "";

console.log(`[SkunkBuilder] Injecting blob via postject...`);
const postjectCmd = [
  "npx postject",
  `"${outputExe}"`,
  "NODE_SEA_BLOB",
  `"${blobPath}"`,
  "--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  postjectMachoSegment
].filter(Boolean).join(" ");

execSync(postjectCmd, { stdio: "inherit" });

// 5. Code Signing & Executable Permissions
if (isMac) {
  console.log(`[SkunkBuilder] Ad-hoc signing macOS binary...`);
  execSync(`codesign --sign - "${outputExe}"`, { stdio: "inherit" });
}

if (!isWindows) {
  fs.chmodSync(outputExe, 0o755);
}

console.log(`[SkunkBuilder] Build complete: ${outputExe}`);
