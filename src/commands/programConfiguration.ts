import { PROGRAM_VERSION, VALID_DATE_TRANSFORM_TYPES } from "../constants.js";
import type { ProgramOptions } from "../types.js";

const programOptions: ProgramOptions[] = [
  {
    short: "n",
    long: "numericTransform",
    description: "Rename files either by sequence (n+1), even (2n), or odd (2n+1). Defaults to 'sequence'.",
    type: "[type]",
    choices: ["sequence", "odd", "even"],
    defaultValue: "sequence",
  },
  {
    short: "s",
    long: "searchAndReplace",
    type: "<search, filter...>",
    description:
      "Will rename part of the filename that matches the filter argument with the replacer argument. A string|regex can be supplied. More than two arguments will be ignored. Operates on the complete filename, including the extension",
    defaultValue: "",
  },
  {
    short: "f",
    long: "folderPath",
    type: "<path>",
    description:
      "Specify folder path for which you would like to perform the transform. If omitted, current directory will be used.",
    defaultValue: "",
  },
  {
    short: "p",
    long: "preserveOriginal",
    type: "[boolean]",
    description:
      "Preserve original filename. Not relevant for the 'searchAndReplace' transform type",
    defaultValue: "true",
    choices: ["true", "false"],
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
    short: "",
    long: "cleanRollback",
    type: "",
    description: "Remove rollback file, if it exists",
    defaultValue: "",
  },
  {
    short: "c",
    long: "customText",
    type: "[name]",
    description:
      "Text to add to the transformed name. This overwrites the preserveOriginal flag.",
    defaultValue: "",
  },
  {
    short: "",
    long: "textPosition",
    description: "If preserveOriginal or additionalText are set, determine whether to prepend or append the name to the transformation. Defaults to append.",
    type: "[position]",
    choices: ["prepend", "append"],
    defaultValue: "append"
  },
  {
    short: "d",
    long: "dateRename",
    type: "[dateOption]",
    description:
      "Rename by different types of date data. Defaults to creationDate. Can be used together with the appendName and dryRun flags.",
    defaultValue: "creationDate",
    choices: VALID_DATE_TRANSFORM_TYPES as unknown as string[],
  },
  {
    short: "",
    long: "detailedDate",
    type: "",
    description:
      "Used with the dateRename option. If included, hours, minutes, and seconds will be included in the chosen date transformation",
  },
  {
    short: "",
    long: "separator",
    type: "[string]",
    description:
      "Specify a custom separator to be used. Defaults to '-'",
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
