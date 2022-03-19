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
  let toggle = `-${short}, --${long}`;
  toggle = type ? `${toggle} ${type}` : toggle;
  const singleOption = new Option(toggle, description);
  if (defaultValue && defaultValue.length) singleOption.preset(defaultValue);
  if (choices && choices.length) singleOption.choices(choices);

  return program.addOption(singleOption);
});

export default program;
