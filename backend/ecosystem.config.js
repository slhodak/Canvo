module.exports = {
  apps: [{
    name: "canvo-server",
    script: "./dist/backend/src/app.js",
    env: {
      "NODE_ENV": "production"
    }
  }]
}