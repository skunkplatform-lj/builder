const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const config = require("../build.js");

const buildDirPath = path.resolve(config.buildDir);
if (!fs.existsSync(buildDirPath)) {
  fs.mkdirSync(buildDirPath, { recursive: true });
}

console.log(`[SkunkBuilder] Preparing blob for ${config.name}...`);
execSync("node --experimental-sea-config skunkbuilder/sea-config.json", { stdio: "inherit" });

const nodeBinary = process.execPath;
const outputExe = path.join(buildDirPath, `${config.appname}.exe`);

console.log(`[SkunkBuilder] Creating base executable...`);
fs.copyFileSync(nodeBinary, outputExe);

console.log(`[SkunkBuilder] Injecting blob into executable via postject...`);
execSync(
  `npx postject "${outputExe}" NODE_SEA_BLOB "${path.join(buildDirPath, "sea-prep.blob")}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`,
  { stdio: "inherit" }
);

console.log(`[SkunkBuilder] Build complete: ${outputExe}`);
