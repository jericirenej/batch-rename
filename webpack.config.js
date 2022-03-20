import webpack from "webpack";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import ResolveTypescriptPlugin from "resolve-typescript-plugin";
import WebpackBundleAnalyzer, {
  BundleAnalyzerPlugin,
} from "webpack-bundle-analyzer";


const __dirname = dirname(fileURLToPath(import.meta.url));
const outputName = "batchRename.js";

export default {
  mode: "production",
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
  /* optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
        },
      },
    },
  }, */
  target: "node",
  experiments: {
    topLevelAwait: true,
    outputModule: true,
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: "static",
      reportFilename: "bundle-analysis.html",
      openAnalyzer: false,
    }),
  ],
};
