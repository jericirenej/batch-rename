import { Command } from "commander";
import programOptions from "./commands/programOptions";

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

const options = program.opts();
console.log(options);
if (!Object.keys(options).length) {
  console.log("No options specified, exiting...");
  process.exit(0);
}
const transformOptions = Object.keys(options).filter(
  (option: string) => option === "odd" || option === "even"
);
if (!transformOptions.length) {
  console.log("No transform option specified, exiting...");
  process.exit(0);
}