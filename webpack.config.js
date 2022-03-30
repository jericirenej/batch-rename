import webpack from "webpack";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import ResolveTypescriptPlugin from "resolve-typescript-plugin";
import WebpackBundleAnalyzer, {
  BundleAnalyzerPlugin,
} from "webpack-bundle-analyzer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputName = "batchRename.mjs";
const determineMode = () => {
  const args = process.argv;
  const modeArg = args.filter((arg) => arg.includes("mode"));
  if (modeArg.length) {
    return modeArg[0].includes("production") ? "production" : "development";
  }
  return "production";
};
export default {
  mode: determineMode(),
  entry: "./src/index.ts",
  context: resolve(__dirname, "."),
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: [/node_modules/],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
    plugins: [new ResolveTypescriptPlugin()],
  },
  output: {
    path: resolve(__dirname, "prod"),
    filename: outputName,
    chunkFormat: "module",
    module: true,
  },
  target: "node",
  experiments: {
    topLevelAwait: true,
    outputModule: true,
  },
  plugins:
    determineMode() === "production"
      ? []
      : [
          new BundleAnalyzerPlugin({
            analyzerMode: "static",
            reportFilename: "bundle-analysis.html",
            openAnalyzer: false,
          }),
        ],
};
