// Generates src/environments/*.ts from .env (Angular can't read .env directly).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const vars = {};
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#')) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const apiUrl = (process.env.API_URL ?? vars.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

for (const [file, production] of [['environment.ts', false], ['environment.prod.ts', true]]) {
  writeFileSync(
    `src/environments/${file}`,
    `// AUTO-GENERATED from .env by scripts/set-env.mjs - do not edit.\nexport const environment = {\n  production: ${production},\n  apiUrl: '${apiUrl}',\n};\n`,
  );
}
console.log(`environment files generated (apiUrl=${apiUrl})`);

