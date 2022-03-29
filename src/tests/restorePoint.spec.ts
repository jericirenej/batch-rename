import fs from "fs";
import { readFile, rename } from "fs/promises";
import { listFiles, determineDir } from "../converters/utils.js";
import {
  restoreBaseFunction,
  restoreOriginalFileNames,
  dryRunRestore,
} from "../converters/restorePoint.js";
import {
  examplePath,
  mockFileList,
  originalNames,
  renameListWithDistinctNewNames,
} from "./mocks.js";
import { ERRORS } from "../messages/errMessages.js";
jest.mock("fs");
jest.mock("fs/promises", () => {
  return {
    readFile: jest.fn(),
    rename: jest.fn(),
  };
});
jest.mock("../converters/utils.js");
const mockList = listFiles as jest.MockedFunction<typeof listFiles>;
const mockDetermineDir = determineDir as jest.MockedFunction<
  typeof determineDir
>;
const mockedFs = jest.mocked(fs, true);
const mockedReadFile = jest.mocked(readFile);
const mockedRename = jest.mocked(rename);

describe("Test restorePoint functions", () => {
  afterEach(() => jest.resetAllMocks());
  describe("Test restoreBaseFunction", () => {
    afterEach(() => jest.resetAllMocks());
    it("Should throw error, if no files exist in targetDir", async () => {
      mockList.mockResolvedValueOnce([]);
      mockDetermineDir.mockReturnValueOnce(examplePath);
      await expect(() => restoreBaseFunction()).rejects.toThrow(
        ERRORS.RESTORE_NO_FILES_TO_CONVERT
      );
    });
    it("Should throw error, if no rollback file exists", async () => {
      mockDetermineDir.mockReturnValueOnce(examplePath);
      mockList.mockResolvedValueOnce(mockFileList);
      mockedFs.existsSync.mockReturnValueOnce(false);
      await expect(() => restoreBaseFunction()).rejects.toThrow(
        ERRORS.RESTORE_NO_ROLLBACK_FILE_TO_CONVERT
      );
    });
    it("Should return configuration file", async () => {
      mockDetermineDir.mockReturnValueOnce(examplePath);
      mockList.mockResolvedValueOnce(originalNames);
      mockedFs.existsSync.mockReturnValueOnce(true);
      const mockedRename = JSON.stringify(renameListWithDistinctNewNames);
      mockedReadFile.mockImplementation(async (path) =>
        Promise.resolve(mockedRename)
      );
      // console.log(await fs.promises.readFile("somePath"));
      console.log(await restoreBaseFunction());
    });
  });
});
