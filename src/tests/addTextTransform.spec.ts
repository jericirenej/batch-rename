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
    const expectedKeys = ["rename", "original", "sourcePath"];
    const keys = Object.keys(renameList[0]);
    keys.forEach((key) => {
      expect(
        renameList[0][key as keyof typeof renameList[0]]
      ).not.toBeUndefined();
    });
  });
  it("Should addText to fileList", () => {
    const renameList = addTextTransform(exampleArgs);
    renameList.forEach((renameInstance) => {
      const { rename } = renameInstance;
      expect(rename).toContain(exampleArgs.addText);
    });
  });
  it("Should call composeRenameString with appropriate arguments", () => {
    const spyOnCompose = jest.spyOn(utils, "composeRenameString");
    const newArgs: GenerateRenameListArgs = {
      ...exampleArgs,
      splitFileList: [splitFileList[0]],
      separator: "|",
      textPosition: "prepend",
      truncate: "3",
    };
    addTextTransform(newArgs);
    expect(spyOnCompose).toHaveBeenCalledTimes(1);
    const call = spyOnCompose.mock.calls.flat()[0];
    const expectations = [
      ["baseName", splitFileList[0].baseName],
      ["newName", newArgs.addText],
      ["ext", splitFileList[0].ext],
      ["separator", newArgs.separator],
      ["textPosition", newArgs.textPosition],
      ["truncate", newArgs.truncate],
    ];
    expectations.forEach((expectation) => {
      const [key, value] = [expectation[0], expectation[1]];
      expect(call[key as keyof typeof call]).toBe(value);
    });
  });
});
