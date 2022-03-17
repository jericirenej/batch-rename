import { Stats } from "fs";
import { stat } from "fs/promises";
import { join, resolve } from "path";
import type {
  DateTransform,
  FileListWithStats,
  ProvideFileStats,
} from "../types";

export const provideFileStats: ProvideFileStats = async (splitFileList) => {
  const splitFileListWithStats: FileListWithStats = await Promise.all(
    splitFileList.map(async (fileInfo) => {
      const { baseName, ext } = fileInfo;
      const originalName = baseName + ext;
      const stats: Stats = await stat(join(process.cwd(), originalName));
      return { ...fileInfo, stats };
    })
  );
  return splitFileListWithStats;
};
