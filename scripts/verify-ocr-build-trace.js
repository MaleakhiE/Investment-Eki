#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('node:fs');
const path = require('node:path');

const tracePath = path.join(
  process.cwd(),
  '.next/server/app/api/transactions/ocr-scan/route.js.nft.json',
);
const requiredPackages = [
  'tesseract.js/src/worker-script',
  'tesseract.js-core',
  'wasm-feature-detect',
  'regenerator-runtime',
  'is-url',
  'node-fetch',
  'bmp-js',
];

if (!fs.existsSync(tracePath)) {
  console.error(`[ocr-trace] Missing route trace: ${tracePath}`);
  process.exit(1);
}

const trace = JSON.parse(fs.readFileSync(tracePath, 'utf8'));
const files = Array.isArray(trace.files) ? trace.files : [];
const missingPackages = requiredPackages.filter((packageName) => (
  !files.some((file) => file.includes(`/node_modules/${packageName}`))
));
const hasCoreJavaScript = files.some((file) => /tesseract-core.*\.js$/.test(file));
const hasCoreWasm = files.some((file) => /tesseract-core.*\.wasm$/.test(file));

if (missingPackages.length > 0 || !hasCoreJavaScript || !hasCoreWasm) {
  console.error('[ocr-trace] OCR runtime assets are incomplete.', {
    missingPackages,
    hasCoreJavaScript,
    hasCoreWasm,
  });
  process.exit(1);
}

console.log(`[ocr-trace] Verified ${requiredPackages.length} runtime packages and Tesseract JS/WASM assets.`);
