import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find workspace root by looking for pnpm-workspace.yaml
function findWorkspaceRoot(startPath: string): string | null {
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

// Find the .env file
const workspaceRoot = findWorkspaceRoot(__dirname);
if (!workspaceRoot) {
  console.error('[ingest] ✗ Could not find workspace root (looking for pnpm-workspace.yaml)');
  process.exit(1);
}

const envPath = path.join(workspaceRoot, '.env');

console.log('[ingest] Workspace root:', workspaceRoot);
console.log('[ingest] .env path:', envPath);
console.log('[ingest] .env exists:', fs.existsSync(envPath));

if (!fs.existsSync(envPath)) {
  console.error('\n[ingest] ✗ .env file not found!');
  console.error('Expected location:', envPath);
  console.error('\nPlease create .env file in repository root.');
  console.error('You can copy .env.example as a template:');
  console.error('  cp .env.example .env');
  console.error('\nThen edit .env with your Xtream credentials.');
  process.exit(1);
}

const result = dotenv.config({ path: envPath, override: true });
if (result.error) {
  console.error('[ingest] ✗ Error loading .env:', result.error.message);
  process.exit(1);
}

console.log('[ingest] ✓ Successfully loaded .env');

const schema = z.object({
  XTREAM_BASE_URL: z.string().url(),
  XTREAM_USERNAME: z.string().min(1),
  XTREAM_PASSWORD: z.string().min(1),
  STORAGE_ROOT: z.string().default('./data'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n[ingest] ✗ Invalid environment configuration');
  console.error('Missing or invalid fields:', parsed.error.flatten().fieldErrors);
  console.error('\nCurrent values:');
  console.error('  XTREAM_BASE_URL:', process.env.XTREAM_BASE_URL || 'NOT SET');
  console.error('  XTREAM_USERNAME:', process.env.XTREAM_USERNAME || 'NOT SET');
  console.error('  XTREAM_PASSWORD:', process.env.XTREAM_PASSWORD ? '***SET***' : 'NOT SET');
  console.error('  STORAGE_ROOT:', process.env.STORAGE_ROOT || 'NOT SET (will use default)');
  console.error('\nPlease check your .env file at:', envPath);
  process.exit(1);
}

export const env = parsed.data;
