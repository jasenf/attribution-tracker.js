import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'));
const packageName = encodeURIComponent(packageJson.name);
const packageVersion = encodeURIComponent(packageJson.version);
const response = await fetch(`https://registry.npmjs.org/${packageName}/${packageVersion}`, {
    headers: { accept: 'application/json' }
});

if (response.status === 200) {
    console.log(`${packageJson.name}@${packageJson.version} is already published.`);
    process.exit(0);
}

if (response.status === 404) {
    console.log(`${packageJson.name}@${packageJson.version} is not published yet.`);
    process.exit(1);
}

throw new Error(`npm registry check failed with HTTP ${response.status}.`);
