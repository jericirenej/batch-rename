import type {
    CreateRollbackFile,
    RenameItem,
    RenameItemsArray,
    RollbackFile,
    TrimRollbackFile
} from "@batch-rename/lib";
import { ERRORS, ROLLBACK_FILE_NAME } from "@batch-rename/lib";
import { existsSync } from "fs";
import { readFile, unlink, writeFile } from "fs/promises";
import { nanoid } from "nanoid";
import { resolve } from "path";
import { checkRestoreFile } from "./restoreUtils.js";
import { determineDir, extractCurrentReferences } from "./utils.js";

const { noRollbackFile } = ERRORS.cleanRollback;

export const readRollbackFile = async (sourcePath?: string): Promise<RollbackFile | null> => {
  const targetDir = determineDir(sourcePath);
  const targetPath = resolve(targetDir, ROLLBACK_FILE_NAME);
  const rollBackFileExists = existsSync(targetPath);
  if (!rollBackFileExists) return null;

  const stringified = await readFile(targetPath, "utf-8");
  const parsedRollbackFile = JSON.parse(stringified);
  const verifiedRollbackFile = checkRestoreFile(parsedRollbackFile);
  return verifiedRollbackFile;
};

export const createRollback: CreateRollbackFile = async ({ sourcePath, transforms }) => {
  const currentRollback = await readRollbackFile(sourcePath);
  if (currentRollback === null) {
    const renameItems: RenameItemsArray = transforms.map(({ original, rename }) => ({
      original,
      rename,
      referenceId: nanoid(),
    }));
    return { sourcePath, transforms: [renameItems] };
  }
  const existingTransforms = currentRollback.transforms;
  const currentOriginals = transforms.map(({ original }) => original);
  const { withIds } = extractCurrentReferences(existingTransforms, currentOriginals);
  const newTransforms: RenameItemsArray = transforms.map(({ original, rename }) => {
    const referenceId = withIds[original] ?? nanoid();
    return { original, rename, referenceId };
  });
  return { sourcePath, transforms: [newTransforms, ...existingTransforms] };
};

export const trimRollbackFile: TrimRollbackFile = async ({ sourcePath, targetLevel, failed }) => {
  const targetDir = determineDir(sourcePath);
  const targetPath = resolve(targetDir, ROLLBACK_FILE_NAME);
  const rollBackFileExists = existsSync(targetPath);
  if (!rollBackFileExists) {
    throw new Error(noRollbackFile);
  }
  const rollbackFile = JSON.parse(await readFile(targetPath, "utf-8"));

  const verifiedRollback = checkRestoreFile(rollbackFile);
  const remainingTransforms = verifiedRollback.transforms.slice(targetLevel);

  const shouldDelete = [remainingTransforms, failed].every((arr) => !arr.length);

  if (shouldDelete) {
    process.stdout.write("Deleting rollback file...");
    await unlink(targetPath);
    process.stdout.write("DONE!");
    return;
  }

  let mappedFailed: RenameItemsArray = [];
  if (failed.length) {
    const mappedEntry = new Map() as Map<string, RenameItem>;

    remainingTransforms[0]?.reduce((map, curr) => map.set(curr.referenceId, curr), mappedEntry);

    if (!mappedEntry.size) {
      mappedFailed = [...failed];
    } else {
      failed.forEach(({ rename, original, referenceId }) => {
        const ref = mappedEntry.get(referenceId);
        if (!ref) return mappedFailed.push({ rename, original, referenceId });

        const isDistinct = original !== ref.rename;
        mappedFailed.push({
          rename,
          original: isDistinct ? ref.rename : original,
          referenceId,
        });
      });
    }

    console.log("Failed restore items will be appended to most recent rollback entry.");
  }

  const newRollbackFile: RollbackFile = {
    sourcePath,
    transforms: [[...mappedFailed], ...remainingTransforms].filter((entry) => entry.length),
  };

  process.stdout.write("Updating rollback file...");
  await writeFile(
    resolve(targetDir, ROLLBACK_FILE_NAME),
    JSON.stringify(newRollbackFile, undefined, 2),
    "utf-8"
  );

  process.stdout.write("DONE!");
};

export const deleteRollbackFile = async (transformPath?: string): Promise<void> => {
  const targetDir = determineDir(transformPath);
  const targetPath = resolve(targetDir, ROLLBACK_FILE_NAME);
  const rollBackFileExists = existsSync(targetPath);
  if (!rollBackFileExists) {
    throw new Error(noRollbackFile);
  }
  process.stdout.write("Deleting rollback file...");
  await unlink(targetPath);
  process.stdout.write("DONE!");
};
