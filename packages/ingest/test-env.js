import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple paths
const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
  path.resolve(__dirname, '..', '..', '..', '.env'),
  path.resolve(__dirname, '..', '..', '..', '..', '.env'),
];

console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('\nTesting .env candidates:');

for (const candidate of candidates) {
  const exists = fs.existsSync(candidate);
  console.log(`  ${exists ? '✓' : '✗'} ${candidate}`);
  
  if (exists) {
    const result = dotenv.config({ path: candidate });
    if (!result.error) {
      console.log(`\n✓ Loaded from: ${candidate}`);
      console.log('Environment variables:');
      console.log('  XTREAM_BASE_URL:', process.env.XTREAM_BASE_URL ? 'SET' : 'MISSING');
      console.log('  XTREAM_USERNAME:', process.env.XTREAM_USERNAME ? 'SET' : 'MISSING');
      console.log('  XTREAM_PASSWORD:', process.env.XTREAM_PASSWORD ? 'SET' : 'MISSING');
      break;
    } else {
      console.log(`  Error loading: ${result.error.message}`);
    }
  }
}

