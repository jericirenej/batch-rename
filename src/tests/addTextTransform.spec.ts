import { addTextTransform } from "../converters/addTextTransform.js";
import * as utils from "../converters/utils.js";
import type { GenerateRenameListArgs } from "../types.js";
import { generateMockSplitFileList } from "./mocks.js";
let splitFileList = generateMockSplitFileList(2);
const exampleArgs: GenerateRenameListArgs = {
  addText: "addText",
  textPosition: undefined,
  separator: undefined,
  truncate: undefined,
  splitFileList,
  transformPattern: ["addText"],
};
describe("addTextTransform", () => {
  it("Should return appropriately shaped response", () => {
    const renameList = addTextTransform(exampleArgs);
    expect(renameList.length).toBe(splitFileList.length);
    const keys = Object.keys(renameList[0]);
    keys.forEach((key) => {
      expect(
        renameList[0][key as keyof typeof renameList[0]]
      ).not.toBeUndefined();
    });
  });
  it("Should call truncateFile, if appropriate", ()=> {
    const spyOnTruncateFile = jest.spyOn(utils, "truncateFile");
    const argsWithTruncate = {...exampleArgs, truncate: "5", splitFileList:[splitFileList[0]]};
    const argsWithoutTruncate = {...argsWithTruncate, truncate: undefined};
    [argsWithTruncate, argsWithoutTruncate].forEach(args =>addTextTransform(args));
    expect(spyOnTruncateFile).toHaveBeenCalledTimes(1);
  })
  it("Should addText to fileList", () => {
    const renameList = addTextTransform(exampleArgs);
    renameList.forEach((renameInstance) => {
      const { rename } = renameInstance;
      expect(rename).toContain(exampleArgs.addText);
    });
  });
});
