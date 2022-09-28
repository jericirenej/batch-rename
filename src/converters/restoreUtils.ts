import { nanoid } from "nanoid";
import { join } from "path";
import { ERRORS, STATUS } from "../messages/index.js";
import type {
    BuildRestoreFile,
    DetermineRollbackLevel,
    FilesWithMissingRestores, LegacyRenameList, RenameItem, RenameItemsArray, RenameList, RestoreFileMapper,
    RestoreList
} from "../types";

const { incorrectRollbackFormat, zeroLevelRollback } = ERRORS.restoreFileMapper;
const { legacyConversion, rollbackLevelOverMax, rollbackLevelsLessThanTarget } =
  STATUS.restoreFileMapper;

export const determineRollbackLevel: DetermineRollbackLevel = ({
  rollbackList,
  rollbackLevel = 1,
}) => {
  if (rollbackLevel === 0) throw new Error(zeroLevelRollback);
  let targetRestoreLevel = rollbackLevel;
  const maximumRestoreLevel = rollbackList.length;
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
): RenameList => {
  const sourcePath = legacyRollbackFile[0].sourcePath;
  const restoreList: RestoreList = { sourcePath, transforms: [] };
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
): rollbackFile is RenameList => {
  if (!rollbackFile) return false;
  if (Array.isArray(rollbackFile)) return false;
  if (typeof rollbackFile !== "object") return false;
  const keys = Object.keys(rollbackFile);
  const topLevelKeys: (keyof RenameList)[] = [
    "sourcePath",
    "transforms",
  ];
  const areKeysPresent =
    keys.length === topLevelKeys.length &&
    topLevelKeys.every((key) => key in rollbackFile);
  if (!areKeysPresent) return false;

  const topLevelObject = rollbackFile as Record<keyof RenameList, any>;
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
export const checkRestoreFile = (rollbackFile: unknown): RenameList => {
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
  const transformRestore: RestoreList = { sourcePath, transforms: [] };
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
}): any => {
  const { transforms, sourcePath } = rollbackFile;
  const targetLevel = determineRollbackLevel({
      rollbackList: transforms,
      rollbackLevel,
    }),
    lookupSlice = transforms.slice(1, targetLevel);
  const restoreList = {} as Record<string, string[]>;
  transforms[0].forEach(
    ({ referenceId, rename, original }) =>
      (restoreList[referenceId] = [rename, original])
  );
  const referenceList = Object.keys(restoreList);

  console.log(restoreList, sourcePath);

  lookupSlice.forEach((transformSlice) => {
    transformSlice.forEach(({ referenceId, original }) => {
      if (referenceList.includes(referenceId)) {
        restoreList[referenceId].push(original);
      }
    });
  });
  console.log(buildRestoreFile({ restoreList, targetLevel, sourcePath }));
  return buildRestoreFile({ restoreList, targetLevel, sourcePath });
};
