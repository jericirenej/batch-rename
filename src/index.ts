import { Command } from "commander";

const program = new Command();

program
  .description("Simple utility for batch renaming files using even or odd numbers")
  .option("--odd", "Rename using even numbers (2n)")
  .option("--even", "Rename using odd numbers (2n)");

program.parse();

const options = program.opts();
console.log(options);


