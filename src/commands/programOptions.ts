const programOptions = [
  {
    short: "o",
    long: "odd",
    type: "",
    description: "Transform argument. Rename using odd numbers (2n+)",
    defaultValue: "",
    choices: [],
  },
  {
    short: "e",
    long: "even",
    type: "",
    description: "Transform argument. Rename using even numbers (2n)",
    defaultValue: "",
    choices: [],
  },
  {
    short: "p",
    long: "preserveOriginal",
    type: "",
    description: "Preserve original filename. Prepend transform string.",
    defaultValue: "",
    choices: [],
  },
  {
    short: "r",
    long: "restore",
    type: "",
    description:
    "Restore transformed files to previous names, if restore file is available.",
    defaultValue: "",
    choices: [],
  },
  {
    short: "D",
    long: "dryRun",
    type: "",
    description: "Run transform operation without writing to disk.",
    defaultValue: "",
    choices: [],
  },
  {
    short: "c",
    long: "cleanRollback",
    type: "",
    description: "Remove rollback file, if it exists",
    defaultValue: "",
    choices: [],
  },
  {
    short: "a",
    long: "appendName",
    type: "[name]",
    description:
    "Specify an optional name to append to transformed files. This overwrites the preserveOriginal flag.",
    defaultValue: "",
    choices: [],
  },
  {
    short: "d",
    long: "sortByDate",
    type: "[dateOption]",
    description:
    "Rename by different types of date data. Defaults to creationDate. Can be used together with the appendName and dryRung flags.",
    defaultValue: "creationDate",
    choices: ["creationDate", "lastAccessed", "lasModified"],
  },
] as const;

const optionKeys = programOptions.map((option) => option.long);
export type OptionKeys = typeof optionKeys[number];
export type OptionKeysWithValues = Record<OptionKeys, boolean | string>;

export default programOptions;

