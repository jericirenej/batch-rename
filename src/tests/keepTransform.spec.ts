import { keepTransform } from "../converters/keepTransform.js";
import * as utils from "../converters/utils.js";
import type { RenameList } from "../types.js";
import { mockKeepList as splitFileList } from "./mocks.js";

const spyOnComposeRename = jest.spyOn(utils, "composeRenameString");

describe("keepTransform", () => {
  afterEach(() => jest.clearAllMocks());
  it("With only 'keep' arg, return should contain only matched string with extension", () => {
    const keep = `Part(\\d{3})`;
    const expected: RenameList = splitFileList.map(
      ({ baseName, ext, sourcePath }, index) => ({
        rename: `Part00${index + 1}${ext}`,
        original: `${baseName}${ext}`,
        sourcePath,
      })
    );
    expect(keepTransform({ splitFileList, keep })).toEqual(expected);
  });
});
