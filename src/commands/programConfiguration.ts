import { PROGRAM_VERSION, VALID_DATE_TRANSFORM_TYPES } from "../constants.js";
import type { ProgramOptions } from "../types.js";

const programOptions: ProgramOptions[] = [
  {
    short: "n",
    long: "numericTransform",
    description: "Rename files by using either a sequence (n+1), even (2n), or odd (2n+1) numbering algorithm. Defaults to 'sequence'",
    type: "[type]",
    choices: ["sequence", "odd", "even"],
    defaultValue: "sequence",
  },
  {
    short: "d",
    long: "dateRename",
    type: "[dateOption]",
    description:
    "Use date-related file information to rename a file. Defaults to 'creationDate'. Can be used together wit the '--detailedDate' flag to add time information.",
    defaultValue: "creationDate",
    choices: VALID_DATE_TRANSFORM_TYPES as unknown as string[],
  },
  {
    short: "s",
    long: "searchAndReplace",
    type: "<search, filter...>",
    description:
      "Takes a string|regex filter argument and a replacer string. In contrast to other two types, this transformations works on the entire file name, including the extension.",
    defaultValue: "",
  },
  {
    short: "f",
    long: "folderPath",
    type: "<path>",
    description:
      "Folder in which the transformation should take place. If omitted, it will default to current working directory.",
    defaultValue: "",
  },
  {
    short: "r",
    long: "restore",
    type: "",
    description:
      "Restore transformed files to original names, if restore file is available.",
    defaultValue: "",
  },
  {
    short: "D",
    long: "dryRun",
    type: "",
    description: "Run transform operation without writing to disk. Expected output will be logged to console.",
    defaultValue: "",
  },
  {
    short: "p",
    long: "preserveOriginal",
    type: "[boolean]",
    description:
      "Preserve original filename. Not relevant for the 'searchAndReplace' transform type. Defaults to 'true'.",
    defaultValue: "true",
    choices: ["true", "false"],
  },
  {
    short: "c",
    long: "customText",
    type: "[name]",
    description:
      "Text to add to the transformed name. Overwrites the 'preserveOriginal' flag.",
    defaultValue: "",
  },
  {
    short: "",
    long: "textPosition",
    description: "Applies to 'preserveOriginal' or 'customText'. Specifies where original or custom text should be appended with respect to the transformation text. Defaults to 'append'",
    type: "[position]",
    choices: ["prepend", "append"],
    defaultValue: "append"
  },
  {
    short: "",
    long: "detailedDate",
    type: "",
    description:
      "Appends time information ('T hh:mm:ss') to date transformations.",
  },
  {
    short: "",
    long: "separator",
    type: "[string]",
    description:
      "Specify a custom character which will be used as a separator in the dateTransformation and between the original|custom text and the transform text. Defaults to hyphen ('-').",
  },
  {
    short: "",
    long: "cleanRollback",
    type: "",
    description: "Remove rollback file.",
    defaultValue: "",
  },
  
];

const programDescription =
  "Allows for batch renaming of files with based on: numbering transformations, date metadata, or search and replace arguments.";

const programName = "batchRename";
const programConfiguration = {
  programVersion: PROGRAM_VERSION,
  programName,
  programDescription,
  programOptions,
};

export default programConfiguration;
