import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { nanoid } from "nanoid";
import { resolve } from "path";
import { ROLLBACK_FILE_NAME } from "../constants.js";
import type {
  CreateRollbackFile, RenameItemsArray,
  RollbackFile
} from "../types.js";
import {
  determineDir,
  extractCurrentReferences,
  jsonParseReplicate
} from "./utils.js";

export const readRollbackFile = async (
  sourcePath?: string
): Promise<RollbackFile | null> => {
  const targetDir = determineDir(sourcePath);
  const targetPath = resolve(targetDir, ROLLBACK_FILE_NAME);
  const rollBackFileExists = existsSync(targetPath);
  if (!rollBackFileExists) return null;

  const stringified =  await readFile(targetPath, "utf-8");
  return jsonParseReplicate<RollbackFile>(stringified);
};

export const createRollback: CreateRollbackFile = async ({
  sourcePath,
  transforms,
}) => {
  const currentRollback = await readRollbackFile(sourcePath);
  if (currentRollback === null) {
    const renameItems: RenameItemsArray = transforms.map((entry) => ({
      ...entry,
      referenceId: nanoid(),
    }));
    return { sourcePath, transforms: [renameItems] };
  }
  const existingTransforms = currentRollback.transforms;
  const currentOriginals = transforms.map(({ original }) => original);
  const { withIds } = extractCurrentReferences(
    existingTransforms,
    currentOriginals
  );
  const newTransforms: RenameItemsArray = transforms.map(
    ({ original, rename }) => {
      const referenceId = withIds[original] ?? nanoid();
      return { original, rename, referenceId };
    }
  );
  return { sourcePath, transforms: [newTransforms, ...existingTransforms] };
};
