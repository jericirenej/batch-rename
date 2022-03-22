import { Command, Option } from "commander";
import programConfiguration from "./programConfiguration.js";
const program = new Command();

const { programDescription, programOptions, programName, programVersion } =
  programConfiguration;
program
  .name(programName)
  .version(programVersion)
  .description(programDescription);

programOptions.forEach((programOption) => {
  const { description, long, short, type, defaultValue, choices } =
    programOption;
  let option = short ? `-${short}, --${long}` : `--${long}`;
  option = type ? `${option} ${type}` : option;
  const singleOption = new Option(option, description);
  if (defaultValue) singleOption.preset(defaultValue);
  if (choices && choices.length) singleOption.choices(choices);

  return program.addOption(singleOption);
});

export default program;
