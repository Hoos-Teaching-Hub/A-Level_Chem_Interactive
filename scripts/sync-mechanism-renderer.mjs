import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const sourcePath = path.join(repoRoot, 'src', 'js', 'mechanism-canvas-renderer.js');
const targetPath = path.join(repoRoot, 'public', 'js', 'mechanism-canvas-renderer.js');

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Renderer source file not found: ${sourcePath}`);
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.copyFileSync(sourcePath, targetPath);

const sourceContents = fs.readFileSync(sourcePath, 'utf8');
const targetContents = fs.readFileSync(targetPath, 'utf8');
if (sourceContents !== targetContents) {
  throw new Error('Renderer sync failed: public copy does not match src copy.');
}

console.log('Synced mechanism canvas renderer from src/js to public/js.');
