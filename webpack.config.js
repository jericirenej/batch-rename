/* eslint-disable no-undef */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/converter.ts",
  context: path.resolve(__dirname, "."),
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    path: path.resolve(__dirname, "prod"),
    filename: "batchTransform.js",
    chunkFilename: "[name]-[contenthash:6].js",
  },
  target: "node",
};
