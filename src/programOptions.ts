import { ProgramOptions } from "./types";

const programOptions: ProgramOptions = [
  {
    short: "o",
    long: "odd",
    type: "",
    description: "Transform argument. Rename using odd numbers (2n+)",
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
    short: "d",
    long: "dryRun",
    type: "",
    description: "Run transform operation without writing to disk.",
    defaultValue: "",
  },
  {
    short: "d",
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
    short: "b",
    long: "basename",
    type: "[name]",
    description:
      "Specify an optional base name for transformed files. This overwrites the preserveOriginal flag.",
    defaultValue: "",
  },
];

export default programOptions;
