import type { PathLike } from "fs";
import { stat } from "fs/promises";
import { DEFAULT_SEPARATOR } from "../constants.js";
import * as dateTransforms from "../converters/dateTransform.js";
import * as formatText from "../converters/formatTextTransform.js";
import type {
  ComposeRenameStringArgs,
  DateTransformCorrespondenceTable,
  FileListWithStatsArray,
  FormattedDate,
  GenerateRenameListArgs
} from "../types.js";
import * as utils from "../utils/utils.js";
import { exampleStats as stats, generateMockSplitFileList } from "./mocks.js";

jest.mock("fs/promises", () => {
  const originalModule = jest.requireActual("fs/promises");
  return {
    __esModule: true,
    ...originalModule,
    stat: jest.fn(),
  };
});
const {
  dateTransform,
  provideFileStats,
  extractDate,
  dateTransformCorrespondenceTable,
} = dateTransforms;

type GenerateStatsDatesArgs = {
  birthtimeMs: number;
  atimeMs: number;
  mtimeMs: number;
  listToModify: FileListWithStatsArray;
};
type GenerateStatsDates = (
  args: GenerateStatsDatesArgs
) => FileListWithStatsArray;

const generateStatDates: GenerateStatsDates = ({
  birthtimeMs,
  atimeMs,
  mtimeMs,
  listToModify,
}) => {
  return listToModify.map((fileInfo) => {
    fileInfo.stats = { ...fileInfo.stats, birthtimeMs, atimeMs, mtimeMs };
    return fileInfo;
  });
};
const dateVariations = {
  birthtimeMs: 123,
  atimeMs: 456,
  mtimeMs: 789,
};

const extractDateExpected: FormattedDate = {
  year: "2022",
  month: "01",
  day: "20",
  hours: "10",
  minutes: "15",
  seconds: "30",
};
const exampleDate = new Date("2022-01-20T10:15:30");

const mockedStat = jest.mocked(stat);
const spyOnAreNewNamesDistinct = jest.spyOn(utils, "areNewNamesDistinct");
const spyOnComposeRenameString = jest.spyOn(utils, "composeRenameString");
const spyOnExtractDate = jest.spyOn(dateTransforms, "extractDate");
const splitFileList = generateMockSplitFileList(10);
const splitFileListWithStats: FileListWithStatsArray = splitFileList.map(
  (file) => ({ ...file, stats })
);

const baseArgs: GenerateRenameListArgs = {
  splitFileList: splitFileListWithStats,
  dateRename: "creationDate",
  transformPattern: ["dateRename"],
  detailedDate: false,
  preserveOriginal: true,
};

describe("provideFileStats", () => {
  afterEach(() => jest.clearAllMocks());
  it("Should add stat info to listFiles output", async () => {
    mockedStat.mockImplementation((filePath: PathLike) =>
      Promise.resolve(stats)
    );
    const fileStats = await provideFileStats(splitFileList);
    fileStats.forEach((fileStat) =>
      expect(fileStat).toEqual({ ...fileStat, stats })
    );
  });
});

describe("extractDate", () => {
  const milliseconds = exampleDate.getTime();
  it("Should return proper object shape", () => {
    const extractedDate = extractDate(milliseconds);
    const expectedKeys: (keyof FormattedDate)[] = [
      "year",
      "month",
      "day",
      "hours",
      "minutes",
      "seconds",
    ];
    const extractedDateKeys = Object.keys(extractedDate);
    expect(expectedKeys.length).toBe(extractedDateKeys.length);
    expect(expectedKeys.every((key) => extractedDateKeys.includes(key))).toBe(
      true
    );
    expect(
      Object.values(extractedDate).every((value) => typeof value === "string")
    ).toBe(true);
  });
  it("Should return proper date values", () => {
    const extractedDate = extractDate(milliseconds);
    expect(extractedDate).toEqual(extractDateExpected);
  });
});

describe("dateTransform", () => {
  beforeEach(() => {
    spyOnAreNewNamesDistinct.mockReturnValue(true);
  });
  afterEach(() => jest.clearAllMocks());
  it("Should call extractDate for each entry", () => {
    dateTransform(baseArgs);
    expect(spyOnExtractDate).toHaveBeenCalledTimes(splitFileList.length);
  });
  it("Should access the correct timestamp property", () => {
    const newFileList = generateStatDates({
      ...dateVariations,
      listToModify: splitFileListWithStats,
    });
    const newArgs = { ...baseArgs, splitFileList: newFileList };
    const argVariations: GenerateRenameListArgs[] = [
      { ...newArgs, dateRename: "creationDate" },
      { ...newArgs, dateRename: "lastAccessed" },
      { ...newArgs, dateRename: "lastModified" },
    ];
    argVariations.forEach((args) => {
      const dateType =
        args.dateRename as keyof DateTransformCorrespondenceTable;
      const targetProp = dateTransformCorrespondenceTable[
        dateType
      ] as keyof typeof dateVariations;
      const expectedValue = dateVariations[targetProp];

      dateTransform(args);
      expect(spyOnExtractDate).toHaveBeenCalledWith(expectedValue);
      spyOnExtractDate.mockClear();
    });
  });
  it("Should call composeRenameString appropriate number of times", () => {
    dateTransform(baseArgs);
    expect(spyOnComposeRenameString).toHaveBeenCalledTimes(
      baseArgs.splitFileList.length
    );
  });
  it("Should call composeRenameString with appropriate arguments", () => {
    const argsToWatch = {
      textPosition: "append" as const,
      preserveOriginal: false,
      addText: "addText",
      separator: "|",
      truncate: "5",
    };
    const newArgs: GenerateRenameListArgs = {
      ...baseArgs,
      splitFileList: baseArgs.splitFileList.slice(0, 1),
      ...argsToWatch,
    };
    const { baseName, ext } = baseArgs.splitFileList[0];
    const expected = { ...argsToWatch, baseName, ext };

    dateTransform(newArgs);

    const composeCall = spyOnComposeRenameString.mock.calls[0].flat()[0];
    Object.keys(expected).forEach((key) => {
      expect(composeCall[key as keyof ComposeRenameStringArgs]).toEqual(
        expected[key as keyof typeof expected]
      );
    });
  });
  it("Should call formatFile (via composeRenameString), if format is supplied", ()=> {
    const argsWithFormat:GenerateRenameListArgs = {...baseArgs, format: "uppercase"};
    const spyOnFormat = jest.spyOn(formatText, "formatFile");
    [baseArgs, argsWithFormat].forEach(args => dateTransform(args));
    expect(spyOnFormat).toHaveBeenCalledTimes(baseArgs.splitFileList.length);
  })
  it("Should use separator in date formatting, unless it's of zero length", () => {
    spyOnExtractDate.mockReturnValue(extractDateExpected);
    const { year, month, day } = extractDateExpected;
    const separators = ["|", "", undefined];
    separators.forEach((separator) => {
      spyOnComposeRenameString.mockClear();
      const newArgs: GenerateRenameListArgs = {
        ...baseArgs,
        separator,
        splitFileList: baseArgs.splitFileList.slice(0, 1),
      };
      dateTransform(newArgs);
      const composeCall = spyOnComposeRenameString.mock.calls.flat()[0].newName;
      const sep = separator && separator.length ? separator : DEFAULT_SEPARATOR;
      const expected = [year, month, day].join(sep);
      expect(composeCall).toBe(expected);
    });
  });
  it("Should prepare a base or extended datePrefix", () => {
    spyOnExtractDate.mockReturnValue(extractDateExpected);
    const { year, month, day, hours, minutes, seconds } = extractDateExpected;

    [false, true].forEach((detailedDate) => {
      spyOnComposeRenameString.mockClear();
      const newArgs: GenerateRenameListArgs = {
        ...baseArgs,
        detailedDate,
        splitFileList: baseArgs.splitFileList.slice(0, 1),
      };
      dateTransform(newArgs);
      const composeCall = spyOnComposeRenameString.mock.calls.flat()[0].newName;
      let expected = [year, month, day].join(DEFAULT_SEPARATOR);
      if (detailedDate) {
        expected += `T${[hours, minutes, seconds].join(DEFAULT_SEPARATOR)}`;
      }
      expect(composeCall).toBe(expected);
    });
  });
  it("Should return properly shaped object", () => {
    spyOnExtractDate.mockReturnValue(extractDateExpected);
    const transformData = dateTransform({ ...baseArgs, detailedDate: false });
    const { year, month, day } = extractDateExpected;
    const { splitFileList } = baseArgs;
    expect(transformData.length).toBe(splitFileList.length);
    transformData.forEach((transform, index) => {
      const targetFile = splitFileList[index];
      const expectedOriginal = `${targetFile.baseName}${targetFile.ext}`;
      expect(transform.original).toBe(expectedOriginal);
      expect(transform.sourcePath).toBe(targetFile.sourcePath);
      const datePart = [year, month, day].join(DEFAULT_SEPARATOR);
      expect(transform.rename.includes(datePart)).toBe(true);
    });
  });
});
