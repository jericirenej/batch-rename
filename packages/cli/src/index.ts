import type { OptionKeysWithValues } from "@batch-rename/lib";
import program from "./generateCommands.js";
import { parseOptions } from "./parseCommands.js";

(async () => {
  program.parse(process.argv);
  const options = program.opts() as OptionKeysWithValues;
  const restArgs = program.args;
  if (restArgs.length) {
    await parseOptions({ ...options, restArgs });
    process.exit(0);
  }
  await parseOptions(options);
  process.exit(0);
})();
