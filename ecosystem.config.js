module.exports = {
  apps: [
    {
      name: "zort",
      script: "dist/server/index.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
