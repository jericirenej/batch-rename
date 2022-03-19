import { Command, Option } from "commander";
import programOptions from "./programOptions.js";
const program = new Command();

program.version("1.0.0").name("batchTransform");

programOptions.forEach((programOption) => {
  const { description, long, short, type, defaultValue, choices } =
    programOption;
  let toggle = `-${short}, --${long}`;
  toggle = type ? `${toggle} ${type}` : toggle;
  const singleOption = new Option(toggle, description);
  if (defaultValue.length) singleOption.preset(defaultValue);
  if (choices.length) singleOption.choices(choices);
  return program.addOption(singleOption);
});

export default program;
