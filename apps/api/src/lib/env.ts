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
  console.warn('[api] Could not find workspace root, using process.cwd()');
}

const envPath = workspaceRoot ? path.join(workspaceRoot, '.env') : path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath, override: true });
  if (result.error) {
    console.warn('[api] Error loading .env:', result.error.message);
  }
} else {
  // Fallback: try default dotenv.config()
  dotenv.config();
}

const schema = z.object({
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  DATA_ROOT: z.string().default('./data'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:8080'),
  XTREAM_USERNAME: z.string().optional(),
  XTREAM_PASSWORD: z.string().optional(),
  XTREAM_BASE_URL: z.string().url().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('[api] Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
