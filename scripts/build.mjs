import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(projectRoot, 'src', 'attribution-tracker.js');
const source = await readFile(sourcePath, 'utf8');
const version = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8')).version;
const banner = `/** Attribution Tracker v${version} | MIT License | https://github.com/jasenf/attribution-tracker.js */\n`;
const browserSource = source
    .replace(/\nexport \{ AttributionTracker \};\nexport default AttributionTracker;\s*$/, '')
    .trim();
const browserBuild = `${banner}(function (global) {\n'use strict';\n\n${browserSource}\n\nglobal.AttributionTracker = AttributionTracker;\n})(typeof window !== 'undefined' ? window : globalThis);\n`;

await mkdir(resolve(projectRoot, 'dist'), { recursive: true });
await mkdir(resolve(projectRoot, 'docs'), { recursive: true });
await writeFile(resolve(projectRoot, 'dist', 'attribution-tracker.esm.js'), `${banner}${source}`);
await writeFile(resolve(projectRoot, 'dist', 'attribution-tracker.js'), browserBuild);
await writeFile(resolve(projectRoot, 'tracker.js'), browserBuild);
await writeFile(resolve(projectRoot, 'docs', 'attribution-tracker.js'), browserBuild);

console.log('Built ESM and browser distributions.');
