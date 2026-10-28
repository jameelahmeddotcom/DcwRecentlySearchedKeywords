const { spawnSync } = require('node:child_process');
const path = require('node:path');

const [extension, hook] = process.argv.slice(2);
if (!hook) {
  console.error('Usage: node scripts/run-commerce-hook.js <extension> <hook>');
  process.exit(1);
}

if (extension && extension !== '-') {
  process.env.EXTENSION = extension;
}

const cli = path.join(__dirname, '..', 'node_modules', '@adobe', 'aio-commerce-lib-app', 'bin', 'cli.mjs');
const result = spawnSync(process.execPath, [cli, 'hooks', hook], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
