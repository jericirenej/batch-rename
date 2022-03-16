/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const path = require("path");
const WebpackBundleAnalyzer = require("webpack-bundle-analyzer");

module.exports = {
  mode: "production",
  entry: "./src/index.ts",
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
  plugins: [new WebpackBundleAnalyzer.BundleAnalyzerPlugin()],
};
