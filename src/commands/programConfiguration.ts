import { PROGRAM_VERSION, VALID_DATE_TRANSFORM_TYPES } from "../constants.js";
import { restoreOriginalFileNames } from "../converters/restorePoint.js";
import { cleanUpRollbackFile } from "../converters/utils.js";
import type { ProgramOptions } from "../types.js";

const programOptions: ProgramOptions[] = [
  {
    short: "n",
    long: "numericTransform",
    description:
      "Rename files by using either a sequence (n+1), even (2n), or odd (2n+1) numbering algorithm. Defaults to 'sequence'",
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
    type: "<search, filter>",
    description:
      "Takes a string|regex filter argument and a replacer string.  By default, the transform will preserve file extensions, unless a '--noPreserveExtension' option is supplied",
    defaultValue: "",
  },
  {
    short: "a",
    long: "addText",
    type: "<name>",
    description:
      "Text to add to the target filename. Can be used on its own, together with 'textPosition' flag, or in combination with other transform types. Overwrites the `preserveOriginal` flag.",
    defaultValue: "",
  },
  {
    short: "t",
    long: "truncate",
    description:
      "Truncate the baseName. Can be used in combination with other transform types or on its own. If preserveOriginal is false or addText is supplied, it has no effect.",
    type: "<number>",
    defaultValue: "",
  },
  {
    short: "e",
    long: "extensionModify",
    type: "<string>",
    description:
      "Modify extension of target files. Can also be used together with the exclude option",
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
    short: "f",
    long: "folderPath",
    type: "<path>",
    description:
      "Folder in which the transformation should take place. Can also be set implicitly with an extra script argument (explicit setting takes precedence). If omitted, the script defaults to current working directory.",
    defaultValue: "",
  },
  {
    short: "D",
    long: "dryRun",
    type: "",
    description:
      "Run transform operation without writing to disk. Expected output will be logged to console.",
    defaultValue: "",
  },
  {
    short: "b",
    long: "baseIndex",
    type: "<number>",
    description:
      "For numeric transform, optional argument to specify the base index from which sequencing will begin.",
    defaultValue: "",
  },
  {
    short: "",
    long: "exclude",
    type: "<string|regex>",
    description:
      "Preemptively exclude files that match a given string or regular expression from being evaluated in the transform functions.",
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
    short: "",
    long: "noExtensionPreserve",
    type: "",
    description:
      "An option for the 'searchAndPreserve' transform which includes the file extension in the transform operation.",
    defaultValue: "",
  },

  {
    short: "",
    long: "textPosition",
    description:
      "Applies to 'preserveOriginal' or 'addText'. Specifies where original or custom text should be appended with respect to the transformation text. Defaults to 'append'",
    type: "[position]",
    choices: ["prepend", "append"],
    defaultValue: "append",
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
      "Specify a custom character which will be used as a separator in the dateTransformation and between the original|custom text and the transform text. Can be an empty string (in this case it will be ignored in date formatting). Defaults to hyphen ('-').",
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

export const utilityActionsCorrespondenceTable = {
  restore: restoreOriginalFileNames,
  cleanRollback: cleanUpRollbackFile,
};

export default programConfiguration;
