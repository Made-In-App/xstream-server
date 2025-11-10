import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Current __dirname:', __dirname);
console.log('Current process.cwd():', process.cwd());

// Find workspace root by looking for pnpm-workspace.yaml
function findWorkspaceRoot(startPath) {
  let current = path.resolve(startPath);
  const root = path.parse(current).root;
  
  while (current !== root) {
    const workspaceFile = path.join(current, 'pnpm-workspace.yaml');
    if (fs.existsSync(workspaceFile)) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

const workspaceRoot = findWorkspaceRoot(__dirname);
console.log('Workspace root found:', workspaceRoot);

if (workspaceRoot) {
  const envPath = path.join(workspaceRoot, '.env');
  console.log('Looking for .env at:', envPath);
  console.log('.env exists:', fs.existsSync(envPath));
  
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error('Error loading .env:', result.error);
    } else {
      console.log('✓ Successfully loaded .env');
      console.log('XTREAM_BASE_URL:', process.env.XTREAM_BASE_URL ? 'SET' : 'MISSING');
      console.log('XTREAM_USERNAME:', process.env.XTREAM_USERNAME ? 'SET' : 'MISSING');
      console.log('XTREAM_PASSWORD:', process.env.XTREAM_PASSWORD ? 'SET' : 'MISSING');
    }
  } else {
    console.error('✗ .env file not found at:', envPath);
  }
} else {
  console.error('✗ Could not find workspace root');
}

