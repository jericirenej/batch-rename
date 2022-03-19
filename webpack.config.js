import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import ResolveTypescriptPlugin from "resolve-typescript-plugin";
import WebpackBundleAnalyzer from "webpack-bundle-analyzer";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  mode: "production",
  entry: "./src/index.ts",
  context: resolve(__dirname, "."),
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
    plugins: [new ResolveTypescriptPlugin()],
  },
  output: {
    path: resolve(__dirname, "prod"),
    filename: "batchRename.js",
    chunkFilename: "[name]-[contenthash:6].js",
  },
  target: "node",
  experiments: {
    topLevelAwait: true,
  },
  plugins: [new WebpackBundleAnalyzer.BundleAnalyzerPlugin()],
};
