/** PM2 config — run: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "lol-notifier",
      cwd: __dirname,
      script: "npm",
      args: "run dev",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
