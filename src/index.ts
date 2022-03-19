import program from "./commands/generateCommands.js";
import { parseOptions } from "./commands/parseCommands.js";
import { OptionKeysWithValues } from "./commands/programOptions.js";

program.parse(process.argv);

const options = program.opts() as OptionKeysWithValues;

console.log("REMAINING ARGS:", program.args);
await parseOptions(options);
