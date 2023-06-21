import type {
  AreNewNamesDistinct,
  AreTransformsDistinct,
  BaseRenameItem,
  BaseRenameList,
  ComposeRenameString,
  CreateBatchRenameList,
  NumberOfDuplicatedNames,
  PromiseRejectedWriteResult,
  RenameItem,
  RenameItemsArray,
  SplitFileList,
  TruncateFileName
} from "@batch-rename/lib";
import {
  DEFAULT_SEPARATOR,
  ERRORS,
  STATUS
} from "@batch-rename/lib";
import { rename } from "fs/promises";
import { join, parse } from "path";
import readline from "readline";
import { formatFile } from "../converters/formatTextTransform.js";

const {
  allRenameFailed,
  pathDoesNotExist,
  pathIsNotDir,
  noChildFiles,
  noChildDirs,
  noChildEntries,
} = ERRORS.utils;
const { truncateInvalidArgument } = ERRORS.transforms;

const { failReport, failItem } = STATUS;


export const extractCurrentReferences = (
  rollbackTransforms: RenameItemsArray[],
  currentNames: string[]
): { withIds: Record<string, string>; noIds: string[] } => {
  const alreadyCheckedRefs: string[] = [];
  let namesLeftToCheck = [...currentNames];
  const namesAndReferences: Record<string, string> = {};
  for (const rollback of rollbackTransforms) {
    if (!namesLeftToCheck.length) break;

    // Names to filter out in the next round;
    const namesToExclude: string[] = [];
    let eligible = rollback;
    if (alreadyCheckedRefs.length) {
      eligible = eligible.filter(({ referenceId }) => !alreadyCheckedRefs.includes(referenceId));
    }
    // eslint-disable-next-line no-continue
    if (!eligible.length) continue;

    namesLeftToCheck.forEach((name) => {
      const found = eligible.find(({ rename }) => name === rename);
      if (found) {
        namesAndReferences[name] = found.referenceId;
        namesToExclude.push(name);
      }
    });

    namesLeftToCheck = namesLeftToCheck.filter((name) => !namesToExclude.includes(name));
  }
  return { withIds: namesAndReferences, noIds: namesLeftToCheck };
};


/** Check for duplicated fileNames which would lead to errors. Takes in an
 * @param args.renameList - Supply rename list of appropriate type.
    @param {"results"|"transforms"} args.checkType - If *'results'* are specified,functions checks if there are duplicated among the target transformed names. 
    If *'transforms'* are specified, it checks whether there exist identical transformation (original === rename). */
export const numberOfDuplicatedNames: NumberOfDuplicatedNames = ({ renameList, checkType }) => {
  if (checkType === "results") {
    const renames = renameList.map(({ rename }) => rename);
    const newNamesUniqueLength = new Set(renames).size;
    return renames.length - newNamesUniqueLength;
  }
  if (checkType === "transforms") {
    const duplicatedTransforms = renameList.filter(({ original, rename }) => original === rename);
    return duplicatedTransforms.length;
  }
  return -1;
};

/** Calls *numberOfDuplicatedNames* with the "results" checkType
 * and then evaluates if the result is less or equal than 0.
 */
export const areNewNamesDistinct: AreNewNamesDistinct = (renameList) => {
  const duplicates = numberOfDuplicatedNames({
    renameList,
    checkType: "results",
  });
  return duplicates <= 0;
};

export const areTransformsDistinct: AreTransformsDistinct = (renameList) => {
  const duplicates = numberOfDuplicatedNames({
    renameList,
    checkType: "transforms",
  });
  return duplicates <= 0;
};

export const filterOutDuplicatedTransforms = (renameList: BaseRenameList): BaseRenameList =>
  renameList.filter(({ original, rename }) => original !== rename);

export const willOverWriteExisting = (
  renameList: BaseRenameList,
  fileList: SplitFileList
): boolean => {
  const originals: string[] = [],
    renames: string[] = [];
  renameList.forEach(({ original, rename }) => {
    originals.push(original);
    renames.push(rename);
  });
  const fileListWithoutTransforms = fileList
    .map(({ baseName, ext }) => `${baseName}${ext}`)
    .filter((existingName) => !originals.includes(existingName));
  if (!fileListWithoutTransforms.length) return false;
  return fileListWithoutTransforms.some((existingName) => renames.includes(existingName));
};


/** Will truncate baseName to the length of the supplied truncate argument
 * If preserveOriginal is false or truncate evaluates to 0,
 * it will return the baseName.
 */
export const truncateFile: TruncateFileName = ({ preserveOriginal, baseName, truncate }) => {
  if (!preserveOriginal) {
    return baseName;
  }
  const limit = Number(truncate);
  if (Number.isNaN(limit)) throw new Error(truncateInvalidArgument);
  if (limit === 0) return baseName;

  return baseName.slice(0, limit);
};

export const composeRenameString: ComposeRenameString = ({
  baseName: _baseName,
  ext,
  addText,
  textPosition,
  separator,
  preserveOriginal,
  newName,
  truncate,
  format,
  noExtensionPreserve,
}) => {
  const position = textPosition || "append";
  const extension = ext || "";
  let sep = "";
  // Allow for empty separator (direct concatenation)
  // For undefined cases, force default separator, unless newName is falsy.
  if (separator) sep = separator;
  if (separator === undefined && newName) sep = DEFAULT_SEPARATOR;

  let modifiedName = newName;

  // Truncate baseName OR add custom text.
  const shouldTruncate = !Number.isNaN(Number(truncate)) && preserveOriginal;
  let baseName = _baseName;
  if (shouldTruncate)
    baseName = truncateFile({
      baseName,
      preserveOriginal,
      truncate: truncate!,
    });
  // Custom text overrides preserveOriginal setting.
  const customOrOriginalText = addText || (preserveOriginal ? baseName : "");
  if (customOrOriginalText) {
    if (position === "append") {
      modifiedName = `${newName}${sep}${customOrOriginalText}`;
    }
    if (position === "prepend") {
      modifiedName = `${customOrOriginalText}${sep}${newName}`;
    }
  }
  // Format final rename text, if argument supplied.
  if (format) {
    if (noExtensionPreserve) {
      return formatFile(`${modifiedName}${extension}`, format);
    }
    modifiedName = formatFile(modifiedName, format);
  }
  return `${modifiedName}${extension}`;
};

/** A factory function which creates an async array of renaming operations
 * for either a transform or a revert operation. Restore operations are triggered
 * if a filesToRevert argument is supplied. */
export const createBatchRenameList: CreateBatchRenameList = ({
  transforms,
  sourcePath,
  filesToRestore = [],
}) => {
  const batchRename: Promise<void>[] = [];
  if (filesToRestore.length) {
    filesToRestore.forEach((file) => {
      const targetName = transforms.find((fileInfo) => {
        const { rename, original } = fileInfo;
        return rename === file && original !== rename;
      });
      if (targetName) {
        const [currentPath, revertPath] = [
          join(sourcePath, file),
          join(sourcePath, targetName.original),
        ];
        return batchRename.push(rename(currentPath, revertPath));
      }
    });
    return batchRename;
  }
  transforms.forEach(({ original, rename: newName }) => {
    if (original !== newName) {
      const [originalFullPath, newNameFullPath] = [
        join(sourcePath, original),
        join(sourcePath, newName),
      ];
      batchRename.push(rename(originalFullPath, newNameFullPath));
    }
  });
  return batchRename;
};

/** Remove entries from the list for which the renaming operation
 * resulted in a rejected promise. */
export const settledPromisesEval = <T extends G[], G extends BaseRenameItem | RenameItem>({
  transformedNames,
  promiseResults,
  operationType,
}: {
  transformedNames: T;
  promiseResults: (PromiseFulfilledResult<void> | PromiseRejectedWriteResult)[];
  operationType: "convert" | "restore";
}): { successful: T; failed: T } => {
  const failed = [] as unknown as T;
  const promisesRejected = promiseResults.filter(
    (settledResult) => settledResult.status === "rejected"
  ).length;

  if (promisesRejected === 0) return { successful: transformedNames, failed };
  if (promisesRejected === transformedNames.length) throw new Error(allRenameFailed);

  console.log(failReport(promisesRejected, operationType));

  const transformMap = transformedNames.reduce(
    (map, curr) => map.set(curr.rename, { ...curr }),
    new Map() as Map<string, G>
  );

  promiseResults.forEach((settledResult) => {
    if (settledResult.status === "rejected") {
      const { path, dest } = settledResult.reason;
      const origin = parse(path).base,
        destination = parse(dest).base;
      console.log(failItem(origin, destination, operationType));
      const targetProp = operationType === "convert" ? destination : origin;
      failed.push(transformMap.get(targetProp)!);
      transformMap.delete(targetProp);
    }
  });
  return { successful: [...transformMap.values()] as T, failed };
};

export const askQuestion = (question: string): Promise<string> => {
  const rl = readline.createInterface(process.stdin, process.stdout);
  return new Promise((resolve) => {
    // eslint-disable-next-line prefer-template
    rl.question(question + "\n", (answer) => resolve(answer));
  });
};
