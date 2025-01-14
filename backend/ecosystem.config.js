module.exports = {
  apps: [{
    name: "wa",
    script: "./dist/app.js",
    env: {
      "NODE_ENV": "production"
    }
  }]
}