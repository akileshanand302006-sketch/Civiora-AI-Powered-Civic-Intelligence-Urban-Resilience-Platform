// ============================================================
// Civiora Unified Development Orchestrator
// Runs backend & web seamlessly without port collisions
// ============================================================

const { concurrently } = require('concurrently');

process.env.CIVIORA_ROOT_ORCHESTRATED = '1';

const { result } = concurrently(
  [
    {
      command: 'npm run dev --workspace=apps/backend',
      name: 'backend',
      prefixColor: 'cyan',
      env: { CIVIORA_ROOT_ORCHESTRATED: '1' },
    },
    {
      command: 'npm run dev --workspace=apps/web',
      name: 'web',
      prefixColor: 'magenta',
      env: { CIVIORA_ROOT_ORCHESTRATED: '1' },
    },
    {
      command: 'node scripts/portBridge.js',
      name: 'bridge',
      prefixColor: 'yellow',
      env: { CIVIORA_ROOT_ORCHESTRATED: '1' },
    },
  ],
  {
    prefix: '[{name}]',
    killOthers: ['failure'],
  }
);

result.then(
  () => process.exit(0),
  (err) => {
    // If stopped by user (SIGINT/SIGTERM), exit cleanly
    process.exit(0);
  }
);
