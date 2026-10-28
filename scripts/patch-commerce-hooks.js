const fs = require('node:fs');
const path = require('node:path');

const files = [
  'node_modules/@adobe/aio-commerce-lib-app/dist/es/commands/index.mjs',
  'node_modules/@adobe/aio-commerce-lib-app/dist/cjs/commands/index.cjs',
];

const pattern = /EXTENSION=([^\s]+) \$packageExec aio-commerce-lib-app hooks ([a-z-]+)/g;
const replacement = 'node scripts/run-commerce-hook.js $1 $2';

for (const relativePath of files) {
  const filePath = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const updated = source.replace(pattern, replacement);
  if (updated !== source) fs.writeFileSync(filePath, updated);
}
