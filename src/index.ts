import { Command } from "commander";

const program = new Command();

program
  .version("1.0.0")
  .name("oddEvenRename")
  .description(
`Simple utility for batch renaming files using even or odd numbers. 
Run this in the folder in which you want to perform the operation.

By default, the transform operation will generate a rollbackFile. 
A transform argument (required) can optionally be combined with --dry-run or --cleanRollback.`
  )
  .option("--odd", "Transform argument. Rename using even numbers (2n)")
  .option("--even", "Transform argument. Rename using odd numbers (2n)")
  .option(
    "--restore",
    "Restore transformed files to previous names, if restore file is available."
  )
  .option("--dry-run", "Run transform operation without writing to disk ")
  .option("--cleanRollback", "Remove rollback file, if it exists")
  .option(
    "--baseName [name]",
    "Specify an optional base name for transformed files."
  );

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
