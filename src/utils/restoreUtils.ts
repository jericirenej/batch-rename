import { nanoid } from "nanoid";
import { ERRORS, STATUS } from "../messages/index.js";
import type {
  CheckExistingFiles,
  DetermineRollbackLevel,
  RenameItem,
  RenameItemsArray,
  RestoreByLevels,
  RollbackFile
} from "../types";
import { jsonReplicate } from "./utils.js";

import type { BaseRenameItem } from "../types.js";

export interface LegacyRenameItem extends BaseRenameItem {
  sourcePath: string;
}
export type LegacyRenameList = LegacyRenameItem[];

const { incorrectRollbackFormat } = ERRORS.restoreFileMapper;
const { legacyConversion, rollbackLevelOverMax, rollbackLevelsLessThanTarget } =
  STATUS.restoreFileMapper;

/** Check which existing files names can be found in the rollback file
 * and which are missing */
export const checkExistingFiles: CheckExistingFiles = ({
  existingFiles,
  transforms,
  rollbackLevel
}) => {
  const filesToRestore: string[] = [],
    fileNames = new Set(existingFiles);

  const flattenedTransforms = transforms.slice(0,rollbackLevel).flat();
  const hashMap = flattenedTransforms.reduce(
    (map, { referenceId, rename }) => {
      const target = map.get(referenceId);
      target ? map.set(referenceId, [...target, rename]) : map.set(referenceId, [rename]);
      return map;
    },
    new Map<string,string[]>()
  );

  let missingFiles: string[] = [];

  // Check that all rename files can be mapped to existing. Go from oldest to newest.
  for (let i = flattenedTransforms.length - 1; i >= 0; i--) {
    if (!fileNames.size || !hashMap.size) break;
    const target = flattenedTransforms[i];
    if (fileNames.has(target.rename)) {
      filesToRestore.push(target.rename);
      fileNames.delete(target.rename);
      hashMap.delete(target.referenceId);
    }
  }

  
  // If any files are missing, return the rename at the target level
  if (hashMap.size) {
    missingFiles = [...hashMap.entries()].map(([key, val]) => val).flat();
  }

  return { filesToRestore, missingFiles };
};

/**Determine target rollback level, based on transform list length and passed
 * rollbackLevel value. By default, maximum restore level  will be set. */
export const determineRollbackLevel: DetermineRollbackLevel = ({
  transformList,
  rollbackLevel,
}) => {
  const maximumRestoreLevel = transformList.length;
  if (rollbackLevel === 0 || rollbackLevel === undefined)
    return maximumRestoreLevel;
  if (rollbackLevel > maximumRestoreLevel) {
    console.log(rollbackLevelOverMax);
    return maximumRestoreLevel;
  }
  return rollbackLevel;
};

/**Convert legacy rollback file which supported only single rollbacks to the new
 * rollback format. */
export const legacyRestoreMapper = (
  legacyRollbackFile: LegacyRenameList
): RollbackFile => {
  const sourcePath = legacyRollbackFile[0].sourcePath;
  const restoreList: RollbackFile = {
    sourcePath,
    transforms: [],
  };
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
    // Allow for extra properties
    // keys.length === topLevelKeys.length &&
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
  const isEachTransformProper = (topLevelObject.transforms as unknown[]).every(
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

/** Return current and target rename for files. If a file's reference
 * is not found at target level, the next most recent name will be supplied. */
export const restoreByLevels: RestoreByLevels = ({
  rollbackFile,
  rollbackLevel = 0,
}) => {
  const { transforms, sourcePath } = rollbackFile;
  const targetLevel = determineRollbackLevel({
    transformList: transforms,
    rollbackLevel,
  });
  const targetSlice = transforms.slice(0, targetLevel).flat();
  const reverseSlice = jsonReplicate(targetSlice).reverse();
  const uniqueReferences = [
    ...new Set(targetSlice.map(({ referenceId }) => referenceId)),
  ];
  const mappedTransform = new Map<
    string,
    { rename: string; original: string }
  >();

  uniqueReferences.forEach((ref) => {
    const rename = targetSlice.find(
      ({ referenceId }) => referenceId === ref
    )?.rename;
    const original = reverseSlice.find(
      ({ referenceId }) => referenceId === ref
    )?.original;
    if (rename && original) {
      mappedTransform.set(ref, { original, rename });
    }
  });

  const restoreTransforms: RenameItem[] = [...mappedTransform.entries()].map(
    ([referenceId, { original, rename }]) => ({ referenceId, original, rename })
  );

  return {
    sourcePath,
    transforms: restoreTransforms,
    targetLevel,
  };
};
