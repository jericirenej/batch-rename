import program from "./commands/generateCommands.js";
import { parseOptions } from "./commands/parseCommands.js";
import type { OptionKeysWithValues } from "./types.js";

(async () => {
  program.parse(process.argv);
  const options = program.opts() as OptionKeysWithValues;
  await parseOptions(options);
  process.exit(0);
})();
