module.exports = {
  apps: [
    {
      name: 'genzy-web', cwd: '/var/www/genzyclub/app', script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1', instances: 1, exec_mode: 'fork', max_memory_restart: '900M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'genzy-worker', cwd: '/var/www/genzyclub/app', script: 'node_modules/tsx/dist/cli.mjs',
      args: '--conditions=react-server scripts/worker.ts', instances: 1, exec_mode: 'fork', max_memory_restart: '300M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
