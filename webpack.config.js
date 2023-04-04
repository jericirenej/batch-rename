import { dirname, resolve } from "path";
import process from "process";
import { fileURLToPath } from "url";

// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/naming-convention
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
        exclude: [/node_modules/, /tests/],
      },
    ],
  },
  resolve: {
    extensionAlias: { ".js": [".ts", ".js"] },
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
};
