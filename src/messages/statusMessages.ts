export const STATUS = {
  dryRun: {
    introText: (transformPattern: string[], transformPath: string) =>
      `Transformations of type ${transformPattern} in folder ${transformPath} would result in the following transform:`,
    warningUnaffectedFiles: (unaffectedFiles: number) =>
      `Number of files for which transform has no effect: ${unaffectedFiles}`,
    warningDuplication: (numOfDuplicated: number)=>  `WARNING: Running the transform on these files with the given parameters would result in ${numOfDuplicated} duplicated names and throw an error!`,
    questionPerformTransform:
      "Would you like to execute the previewed transform (N/Y)?",
    exitVoidTransform: "No file names would be transformed under the current settings!",
    exitWithoutTransform: "Exited application without performing transform.",
  },
};
