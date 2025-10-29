#!/usr/bin/env bash
set -euo pipefail

# Move to repo tutorial directory
dirname "${BASH_SOURCE[0]}" >/dev/null 2>&1 || exit 0
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 1) Ensure package.json exists
if [ ! -f package.json ]; then
  echo "Initializing package.json..."
  npm init -y >/dev/null
fi

# 2) Basic package.json fields
npm pkg set description="meteor-sdk tutorial examples" >/dev/null 2>&1 || true
npm pkg set type=module >/dev/null 2>&1 || true

# 3) Dependencies
echo "Installing dependencies (meteor-sdk)..."
npm install meteor-sdk

echo "Installing dev dependencies (TypeScript, ts-node, @types/node)..."
npm install -D typescript ts-node @types/node

# 4) tsconfig.json
if [ ! -f tsconfig.json ]; then
  echo "Initializing tsconfig.json..."
  npx tsc --init --module esnext --target es2022 --moduleResolution node16 >/dev/null
fi

# Ensure Node types and lib settings
node - <<'NODE'
const fs = require('fs');
const path = 'tsconfig.json';
if (!fs.existsSync(path)) process.exit(0);
const strip = s => s.replace(/\/\/.*$/mg,'').replace(/\/\*[\s\S]*?\*\//g,'');
let data;
try {
  data = JSON.parse(strip(fs.readFileSync(path,'utf8')));
} catch (e) {
  // fallback minimal config
  data = { compilerOptions: {} };
}
const c = data.compilerOptions ||= {};
c.types = Array.from(new Set([...(c.types||[]), 'node']));
c.lib = Array.from(new Set([...(c.lib||[]), 'es2022']));
c.module = 'esnext';
c.target = 'es2022';
c.moduleResolution = 'node16';
fs.writeFileSync(path, JSON.stringify(data, null, 2));
NODE

# 5) Scripts
node - <<'NODE'
const fs = require('fs');
const pkgPath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath,'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts.build = pkg.scripts.build || 'tsc -p .';
pkg.scripts.dev = pkg.scripts.dev || 'ts-node --esm src/index.ts';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
NODE

echo "Toolchain setup complete."