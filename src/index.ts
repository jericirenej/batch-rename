import program from "./commands/generateCommands.js";
import { parseOptions } from "./commands/parseCommands.js";
import type { OptionKeysWithValues } from "./types.js";

(async () => {
  program.parse(process.argv);
  const options = program.opts() as OptionKeysWithValues;
  const restArgs = program.args;
  if(restArgs.length) {
    await parseOptions({...options, restArgs});
    process.exit(0);
  }
  await parseOptions(options);
  process.exit(0);
})();
