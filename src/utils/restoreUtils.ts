import { nanoid } from "nanoid";
import { join } from "path";
import { ERRORS, STATUS } from "../messages/index.js";
import type {
  BuildRestoreFile,
  CheckExistingFiles, ConversionList, DetermineRollbackLevel,
  FilesWithMissingRestores,
  LegacyRenameList,
  RenameItem,
  RenameItemsArray,
  RestoreFileMapper, RollbackFile
} from "../types";

const { incorrectRollbackFormat, zeroLevelRollback } = ERRORS.restoreFileMapper;
const { legacyConversion, rollbackLevelOverMax, rollbackLevelsLessThanTarget } =
  STATUS.restoreFileMapper;

/** Check which existing files names can be found in the rollback file
 * and which are missing */
export const checkExistingFiles: CheckExistingFiles = ({
  existingFiles,
  transforms,
}) => {
  const filesToRestore: string[] = [],
    fileNames = [...existingFiles],
    uniqueRenames = new Set(transforms.flat().map(({ rename }) => rename));

  for (const rename of uniqueRenames) {
    if (fileNames.includes(rename)) filesToRestore.push(rename);
  }
  const missingFiles = [...uniqueRenames].filter(
    (rename) => !filesToRestore.includes(rename)
  );
  return { filesToRestore, missingFiles };
};

/**Determine target rollback level, based on transform list length and passed
 * rollbackLevel value. */
export const determineRollbackLevel: DetermineRollbackLevel = ({
  transformList,
  rollbackLevel = 1,
}) => {
  if (rollbackLevel === 0) throw new Error(zeroLevelRollback);
  let targetRestoreLevel = rollbackLevel;
  const maximumRestoreLevel = transformList.length;
  if (rollbackLevel > maximumRestoreLevel) {
    console.log(rollbackLevelOverMax);
    targetRestoreLevel = maximumRestoreLevel;
  }
  return targetRestoreLevel;
};

/**Convert legacy rollback file which supported only single rollbacks to the new
 * rollback format. */
export const legacyRestoreMapper = (
  legacyRollbackFile: LegacyRenameList
): RollbackFile => {
  const sourcePath = legacyRollbackFile[0].sourcePath;
  const restoreList: ConversionList = { sourcePath, transforms: [] };
  const legacyRollbackWithReferenceId: RenameItemsArray =
    legacyRollbackFile.map(({ rename, original }) => ({
      original,
      rename,
      referenceId: nanoid(),
    }));
  return { ...restoreList, transforms: [[...legacyRollbackWithReferenceId]] };
};

/**Type guard for legacy restore files */
export const isLegacyRestore = (
  rollbackFile: unknown
): rollbackFile is LegacyRenameList => {
  if (!(rollbackFile && Array.isArray(rollbackFile))) return false;
  const legacyProps = ["rename", "original", "sourcePath"];
  const isLegacy = rollbackFile.every((entry) => {
    const objEntries = Object.entries(entry);
    if (objEntries.length !== legacyProps.length) return false;
    for (const [key, value] of objEntries) {
      const isValueString = typeof value === "string";
      const isKeyIncluded = legacyProps.includes(key);
      const conditions = [isValueString, isKeyIncluded].every(
        (evaluation) => evaluation
      );
      if (!conditions) return false;
    }
    return true;
  });
  return isLegacy;
};

/**Type guard for current restore files */
export const isCurrentRestore = (
  rollbackFile: unknown
): rollbackFile is RollbackFile => {
  if (!rollbackFile) return false;
  if (Array.isArray(rollbackFile)) return false;
  if (typeof rollbackFile !== "object") return false;
  const keys = Object.keys(rollbackFile);
  const topLevelKeys: (keyof RollbackFile)[] = ["sourcePath", "transforms"];
  const areKeysPresent =
    keys.length === topLevelKeys.length &&
    topLevelKeys.every((key) => key in rollbackFile);
  if (!areKeysPresent) return false;

  const topLevelObject = rollbackFile as Record<keyof RollbackFile, any>;
  const areTopLevelProperTypes =
    typeof topLevelObject.sourcePath === "string" &&
    Array.isArray(topLevelObject.transforms);
  if (!areTopLevelProperTypes) return false;

  const renameItemKeys: (keyof RenameItem)[] = [
    "original",
    "referenceId",
    "rename",
  ];
  const isEachTransformProper = (topLevelObject.transforms as any[]).every(
    (transform) => {
      if (!Array.isArray(transform)) return false;
      for (const fileTransform of transform) {
        if (Array.isArray(fileTransform) || typeof fileTransform !== "object")
          return false;

        const areKeysProper = renameItemKeys.every(
          (key) => fileTransform[key] && typeof fileTransform[key] === "string"
        );
        if (!areKeysProper) return false;
      }
      return true;
    }
  );

  return isEachTransformProper;
};

/**Check that the rollbackFile conforms to either the current or legacy
 * rollback file type. Converts legacy rollbacks to current type.
 * Throws error, if file does not conform.*/
export const checkRestoreFile = (rollbackFile: unknown): RollbackFile => {
  if (isCurrentRestore(rollbackFile)) return rollbackFile;
  if (isLegacyRestore(rollbackFile)) {
    console.log(legacyConversion);
    return legacyRestoreMapper(rollbackFile);
  }
  throw new Error(incorrectRollbackFormat);
};

/**Evaluate the restore list. For elements that have fewer restores than
 * the target level, log this to the console. Return a single transform from
 * the latest file to the target (or earliest available) original name */
export const buildRestoreFile: BuildRestoreFile = ({
  restoreList,
  targetLevel,
  sourcePath,
}) => {
  const filesWithMissingRestores = [] as FilesWithMissingRestores[];
  const entries = Object.entries(restoreList);
  const transformRestore: ConversionList = { sourcePath, transforms: [] };
  entries.forEach(([referenceId, transformList]) => {
    const [rename, original] = [
      transformList[0],
      transformList[transformList.length - 1],
    ];
    // Transform list should be equal to number of rollbacks + current name
    if (transformList.length < targetLevel + 1) {
      filesWithMissingRestores.push({
        file: join(sourcePath, rename).replaceAll("\\", "/"),
        found: transformList.length - 1,
        requested: targetLevel,
      });
    }
    return transformRestore.transforms.push({ rename, original, referenceId });
  });
  // Notify if some transforms restore levels are less than requested
  if (filesWithMissingRestores.length) {
    console.log(
      rollbackLevelsLessThanTarget(
        filesWithMissingRestores.length,
        entries.length
      )
    );
    console.table(filesWithMissingRestores);
  }
  return transformRestore;
};

export const restoreFileMapper: RestoreFileMapper = ({
  rollbackFile,
  rollbackLevel = 1,
}) => {
  const { transforms, sourcePath } = rollbackFile;
  const targetLevel = determineRollbackLevel({
    transformList: transforms,
    rollbackLevel,
  });
  const restoreList = {} as Record<string, string[]>;
  const flatTransform = transforms.slice(0, targetLevel).flat(2);
  const uniqueReferences = [
    ...new Set(flatTransform.map(({ referenceId }) => referenceId)),
  ];
  uniqueReferences.forEach((reference) => {
    const referenceTransformSequence = flatTransform.reduce(
      (acc, { original, rename, referenceId }) => {
        if (!(referenceId === reference)) return acc;
        if (!acc.length) {
          return (acc = [rename, original]);
        }
        // Remove the last element, so we don't get duplication
        // between the original and previous rename.
        return (acc = [...acc.slice(0, -1), rename, original]);
      },
      [] as string[]
    );
    restoreList[reference] = [...referenceTransformSequence];
  });
  return buildRestoreFile({ restoreList, targetLevel, sourcePath });
};
