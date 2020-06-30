const path = require("path");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "public", "javascripts"),
  },
  watch: true,
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 600,
  },
};
