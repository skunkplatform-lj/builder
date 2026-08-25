# SkunkBuilder

**SkunkBuilder** is the official build engine for packaging Node.js (v24+) command-line applications into single-file, zero-dependency standalone binaries for Windows, Linux, and macOS using native **Node.js Single Executable Applications (SEA)** and `postject`.

---

## Repository Structure

```text
├── build.js              # Central application configuration
├── main.js               # Application entry point script
├── cmd.njs.yml           # GitHub Actions workflow runner
└── skunkbuilder/
    └── building.js       # Core build engine logic

```

---

## Configuration (`build.js`)

You can define project parameters and target platforms in `build.js` at the root of your project:

```javascript
module.exports = {
  buildDir: "build",
  version: "1.0.0",
  package: "com.skunkplatform.finescript.cli",
  name: "Example CLI",
  appname: "examplecli",
  mainScript: "main.js",
  platforms: ["win64", "linux64", "macos64"]
};

```

### Configuration Options

| Option | Type | Description |
| --- | --- | --- |
| `buildDir` | `String` | Output folder for built executables and blob assets. |
| `version` | `String` | Application release version. |
| `package` | `String` | Unique package identifier. |
| `name` | `String` | Human-readable name of the application. |
| `appname` | `String` | Output binary filename (excluding OS extensions). |
| `mainScript` | `String` | Relative path to the primary JavaScript entry point. |
| `platforms` | `Array` | Supported target platforms (`"win64"`, `"linux64"`, `"macos64"`). |

---

## Local Build Setup

### Prerequisites

* **Node.js**: `v24.0.0` or higher
* **npm**: `postject` dependency installed locally or run via `npx`

1. **Install Dependencies**
Install `postject` as a project dependency:
```bash
npm install postject

```


2. **Run Build Engine**
Execute the builder script:
```bash
node skunkbuilder/building.js

```



---

## Build Process Overview

1. **Platform Validation:** Evaluates `config.platforms` against `process.platform`. If the host OS is not listed, the builder skips execution gracefully.
2. **SEA Blob Generation:** Creates a temporary JSON configuration and invokes `node --experimental-sea-config` to build `sea-prep.blob`.
3. **Binary Preparation:** Copies the host machine's native `node` binary to `build/<appname>[.exe]`.
4. **Postject Injection:** Injects `sea-prep.blob` into the target binary fuse section (`NODE_SEA_FUSE_fce680ab...`).
5. **OS Finalization:**
* **macOS:** Applies ad-hoc code signing via `codesign --sign -`.
* **Linux/macOS:** Grants execution permissions via `chmod 755`.



---

## GitHub Actions Pipeline (`cmd.njs.yml`)

The matrix workflow automatically spins up platform runners matching your configuration to publish compiled artifacts on push.

```yaml
name: SkunkPlatform CLI Builder

on: [push]

jobs:
  build:
    name: Build (${{ matrix.platform }})
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - platform: win64
            os: windows-latest
            exec_path: build/examplecli.exe
            artifact_name: examplecli-win64.exe
          - platform: linux64
            os: ubuntu-latest
            exec_path: build/examplecli
            artifact_name: examplecli-linux64
          - platform: macos64
            os: macos-latest
            exec_path: build/examplecli
            artifact_name: examplecli-macos64

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js v24
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Install dependencies
        run: npm install postject

      - name: Build Executable
        run: node skunkbuilder/building.js

      - name: Upload Temporary Build Artifact
        if: hashFiles(matrix.exec_path) != ''
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.artifact_name }}
          path: ${{ matrix.exec_path }}
          retention-days: 1

```
