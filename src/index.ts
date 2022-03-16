import { Command } from "commander";
import { parseOptions } from "./commands/parseCommands";
import programOptions, {
  OptionKeysWithValues,
} from "./commands/programOptions";

(async () => {
  const program = new Command();

  program.version("1.0.0").name("batchTransform");

  programOptions.forEach((programOption) => {
    const { description, long, short, type, defaultValue } = programOption;
    let toggle = `-${short}, --${long}`;
    toggle = type ? `${toggle} ${type}` : toggle;
    if (defaultValue) {
      return program.option(toggle, description, defaultValue);
    }
    return program.option(toggle, description, defaultValue);
  });

  program.parse(process.argv);

  const options = program.opts() as OptionKeysWithValues;

  parseOptions(options);
})();
