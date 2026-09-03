module.exports = {
  apps: [
    {
      name: 'snap-backend',
      cwd: __dirname,
      script: 'dist/index.js',
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '512M',
      merge_logs: true,
      time: true,
      out_file: 'logs/pm2-out.log',
      error_file: 'logs/pm2-error.log',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || '3000',
      },
    },
  ],
};
