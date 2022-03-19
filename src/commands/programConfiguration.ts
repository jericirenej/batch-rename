import { PROGRAM_VERSION } from "../constants.js";
import type { ProgramOptions } from "../types.js";

const programOptions: ProgramOptions[] = [
  {
    short: "o",
    long: "odd",
    type: "",
    description: "Transform argument. Rename using odd numbers (2n+1)",
    defaultValue: "",
  },
  {
    short: "e",
    long: "even",
    type: "",
    description: "Transform argument. Rename using even numbers (2n)",
    defaultValue: "",
  },
  {
    short: "p",
    long: "preserveOriginal",
    type: "",
    description: "Preserve original filename. Prepend transform string.",
    defaultValue: "",
  },
  {
    short: "r",
    long: "restore",
    type: "",
    description:
      "Restore transformed files to previous names, if restore file is available.",
    defaultValue: "",
  },
  {
    short: "D",
    long: "dryRun",
    type: "",
    description: "Run transform operation without writing to disk.",
    defaultValue: "",
  },
  {
    short: "c",
    long: "cleanRollback",
    type: "",
    description: "Remove rollback file, if it exists",
    defaultValue: "",
  },
  {
    short: "a",
    long: "appendName",
    type: "[name]",
    description:
      "Specify an optional name to append to transformed files. This overwrites the preserveOriginal flag.",
    defaultValue: "",
  },
  {
    short: "d",
    long: "sortByDate",
    type: "<dateOption>",
    description:
      "Rename by different types of date data. Defaults to creationDate. Can be used together with the appendName and dryRun flags.",
    defaultValue: "creationDate",
    choices: ["creationDate", "lastAccessed", "lastModified"],
  },
  {
    short: "s",
    long: "searchAndReplace",
    type: "<filter, replacer>",
    description:
      "Will rename files that match the filter argument with the replacer argument. A string or a regex can be supplied. Can be used together with the dryRun flags.",
    defaultValue: "",
  },
];

const programDescription =
  "Allows for batch renaming of files with based on: odd or even numbering, date metadata, or search and replace arguments.";

const programName = "batchRename";
const programConfiguration = {
  programVersion: PROGRAM_VERSION,
  programName,
  programDescription,
  programOptions,
};

export default programConfiguration;
