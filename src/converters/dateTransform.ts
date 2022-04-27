import { Stats } from "fs";
import { stat } from "fs/promises";
import { join } from "path";
import { DEFAULT_SEPARATOR } from "../constants.js";
import { ERRORS } from "../messages/errMessages.js";
import type {
  DateTransform,
  DateTransformCorrespondenceTable,
  FileListWithDates,
  FileListWithStatsArray,
  FormattedDate,
  ProvideFileStats
} from "../types";
import { composeRenameString } from "./utils.js";

const { DUPLICATE_FILE_NAMES } = ERRORS;

export const provideFileStats: ProvideFileStats = async (splitFileList) => {
  const splitFileListWithStats: FileListWithStatsArray = await Promise.all(
    splitFileList.map(async (fileInfo) => {
      const { baseName, ext, sourcePath } = fileInfo;
      const originalName = baseName + ext;
      const stats: Stats = await stat(join(sourcePath, originalName));
      return { ...fileInfo, stats };
    })
  );
  return splitFileListWithStats;
};

export const dateTransformCorrespondenceTable: DateTransformCorrespondenceTable =
  {
    creationDate: "birthtimeMs",
    lastAccessed: "atimeMs",
    lastModified: "mtimeMs",
  };

export const extractDate = (milliseconds: number): FormattedDate => {
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

export const dateTransform: DateTransform = ({
  splitFileList,
  dateRename,
  addText,
  textPosition,
  preserveOriginal,
  detailedDate,
  separator,
  truncate,
}) => {
  const statProp = dateTransformCorrespondenceTable[dateRename!];
  let originalFileList = splitFileList as FileListWithStatsArray;
  let fileListWithDates: FileListWithDates[] = originalFileList.map(
    (fileInfo) => {
      const { baseName, stats, ext, sourcePath } = fileInfo;
      const formattedDate = extractDate(stats[statProp] as number);
      return { baseName, ext, formattedDate, sourcePath };
    }
  );

  const transformedNames = fileListWithDates.map((file) => {
    const { baseName, ext, formattedDate, sourcePath } = file;
    const { year, month, day, hours, minutes, seconds } = formattedDate;
    const sep = separator && separator.length ? separator : DEFAULT_SEPARATOR;
    let datePrefix = [year, month, day].join(sep);
    if (detailedDate) {
      datePrefix += `T${[hours, minutes, seconds].join(sep)}`;
    }
    const rename = composeRenameString({
      baseName,
      ext,
      preserveOriginal,
      newName: datePrefix,
      addText,
      textPosition,
      separator,
      truncate,
    });

    return {
      rename,
      original: `${baseName}${ext}`,
      sourcePath,
    };
  });

  return transformedNames;
};
