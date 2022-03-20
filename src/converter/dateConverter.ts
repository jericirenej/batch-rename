import { Stats } from "fs";
import { stat } from "fs/promises";
import { join, resolve } from "path";
import type {
  DateTransform,
  DateTransformOptions,
  FileListWithDates,
  FileListWithStatsArray,
  FormattedDate,
  ProvideFileStats,
} from "../types";

export const provideFileStats: ProvideFileStats = async (splitFileList) => {
  const splitFileListWithStats: FileListWithStatsArray = await Promise.all(
    splitFileList.map(async (fileInfo) => {
      const { baseName, ext } = fileInfo;
      const originalName = baseName + ext;
      const stats: Stats = await stat(join(process.cwd(), originalName));
      return { ...fileInfo, stats };
    })
  );
  return splitFileListWithStats;
};

const dateTransformCorrespondenceTable: Record<
  DateTransformOptions,
  keyof Stats
> = {
  creationDate: "birthtimeMs",
  lastAccessed: "atimeMs",
  lastModified: "mtimeMs",
};

const extractDate = (milliseconds: number): FormattedDate => {
  const formatDate = (date: string, minLength = 2): string => {
    if (date.length >= minLength) return date.toString();
    return [...new Array(minLength - date.length).fill(0), date].join("");
  };
  const toDate = new Date(milliseconds);
  const [year, month, day, hours, minutes, seconds] = [
    toDate.getFullYear().toString(),
    formatDate((toDate.getMonth() + 1).toString()),
    formatDate(toDate.getDate().toString()),
    formatDate(toDate.getHours().toString()),
    formatDate(toDate.getMinutes().toString()),
    formatDate(toDate.getSeconds().toString()),
  ];

  return { year, month, day, minutes, hours, seconds };
};

export const dateTransform: DateTransform = (dateTransformArgs) => {
  const {
    splitFileList,
    dateRename,
    appendName,
    preserveOriginal,
    detailedDate,
  } = dateTransformArgs;
  const statProp = dateTransformCorrespondenceTable[dateRename!];
  let originalFileList = splitFileList as FileListWithStatsArray;
  let fileListWithDates: FileListWithDates[] = originalFileList.map(
    (fileInfo) => {
      const { baseName, stats, ext } = fileInfo;
      const formattedDate = extractDate(stats[statProp] as number);
      return { baseName, ext, formattedDate };
    }
  );

  const transformedNames = fileListWithDates.map((file) => {
    const { baseName, ext, formattedDate } = file;
    const { year, month, day, hours, minutes, seconds } = formattedDate;
    let datePrefix = [year, month, day].join("-");
    if (detailedDate) {
      datePrefix += `T${hours}-${minutes}-${seconds}`;
    }
    let finalBaseName = datePrefix;
    if (preserveOriginal) {
      finalBaseName = `${datePrefix}-${baseName}`;
    }
    if (appendName) {
      finalBaseName = `${datePrefix}-${appendName}`;
    }

    return {
      rename: `${finalBaseName}${ext}`,
      original: `${baseName}${ext}`,
    };
  });
  //** Check that all names are distinct. If not,
  //** throw error to avoid renaming the first file.
  const areNamesDistinct = transformedNames.every((nameEntry) => {
    const occurrences = transformedNames.filter(
      (entry) => entry.rename === nameEntry.rename
    );
    return occurrences.length === 1;
  });
  if (areNamesDistinct) return transformedNames;
  throw new Error(
    "Transformation would lead to duplication of file names! Operation aborted."
  );
};
