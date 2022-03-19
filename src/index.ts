import program from "./commands/generateCommands.js";
import { parseOptions } from "./commands/parseCommands.js";
import type { OptionKeysWithValues } from "./types.js";

program.parse(process.argv);

const options = program.opts() as OptionKeysWithValues;

// console.log("OPTIONS", options);
// console.log("REMAINING ARGS", process.argv);
await parseOptions(options);
