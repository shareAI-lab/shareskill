const fs = require("fs");
const path = require("path");

const source = path.join(
  __dirname,
  "..",
  "node_modules",
  "sql.js",
  "dist",
  "sql-wasm.wasm"
);
const destDir = path.join(__dirname, "..", "public");
const dest = path.join(destDir, "sql-wasm.wasm");

if (!fs.existsSync(source)) {
  console.warn("sql.js wasm not found; install dependencies first.");
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(source, dest);
console.log("Copied sql-wasm.wasm to public/");
