import { Command, Option } from "commander";
import { parseOptions } from "./commands/parseCommands";
import programOptions, {
  OptionKeysWithValues,
} from "./commands/programOptions";

(async () => {
  const program = new Command();

  program.version("1.0.0").name("batchTransform");

  programOptions.forEach((programOption) => {
    const { description, long, short, type, defaultValue, choices } = programOption;
    let toggle = `-${short}, --${long}`;
    toggle = type ? `${toggle} ${type}` : toggle;
    const singleOption = new Option(toggle, description);
    if(defaultValue.length) singleOption.preset(defaultValue);
    if(choices.length) singleOption.choices(choices);
    return program.addOption(singleOption);
  });

  program.parse(process.argv);

  const options = program.opts() as OptionKeysWithValues;

  console.log(options);
  return parseOptions(options);
})();
