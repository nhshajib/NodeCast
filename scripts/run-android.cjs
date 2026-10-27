// Cross-platform launcher: regenerates the correct native app when switching editions.
const { spawnSync } = require('node:child_process');
const target = process.argv[2];
if (!['mobile', 'tv'].includes(target)) throw new Error('Choose mobile or tv.');
const env = { ...process.env, NODECAST_TARGET: target, EXPO_PUBLIC_APP_VARIANT: target };
const cli = require.resolve('expo/bin/cli');
for (const args of [['prebuild', '--platform', 'android', '--clean'], ['run:android', '--variant', 'release']]) {
  const result = spawnSync(process.execPath, [cli, ...args], { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
