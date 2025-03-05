module.exports = {
  apps: [{
    name: "canvo-server",
    script: "./dist/app.js",
    env: {
      "NODE_ENV": "production",
      "FRONTEND_PATH": "/home/ec2-user/canvo/frontend/dist"
    }
  }]
}
