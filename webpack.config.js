const path = require("path");

module.exports = {
  entry: {
    main: "./src/index.js",
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "public", "javascripts"),
  },
  watch: true,
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 600,
  },
};
