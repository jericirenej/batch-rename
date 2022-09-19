import { determineRollbackLevel } from "../converters/restoreUtils";
import { ERRORS, STATUS } from "../messages/index";
import { NewRenameItemList } from "../types";
import { newRenameList } from "./mocks";

const { incorrectRollbackFormat, zeroLevelRollback } = ERRORS.restoreFileMapper;
const { legacyConversion, rollbackLevelOverMax, rollbackLevelsLessThanTarget } =
  STATUS.restoreFileMapper;

describe("determineRollbackLevel", () => {
  const rollbackLength = 10,
    rollbackList = new Array(rollbackLength).fill(
      newRenameList
    ) as NewRenameItemList[];
  let spyOnConsole: jest.SpyInstance;
  beforeEach(
    () =>
      (spyOnConsole = jest
        .spyOn(console, "log")
        .mockImplementation((message) => {}))
  );
  afterEach(() => spyOnConsole.mockRestore());
  it("Should throw error, if rollback level is 0", () => {
    expect(() =>
      determineRollbackLevel({ rollbackList, rollbackLevel: 0 })
    ).toThrowError(zeroLevelRollback);
  });
  it("Should set restore index to the last array entry (length-1) if rollbackLevel is over maximum", () => {
    expect(
      determineRollbackLevel({
        rollbackList,
        rollbackLevel: rollbackLength + 1,
      })
    ).toBe(rollbackLength);
  });
  it("Should notify the user, if rollbackLevel is over maximum", () => {
    expect(spyOnConsole).not.toHaveBeenCalled();
    determineRollbackLevel({
      rollbackList,
      rollbackLevel: rollbackLength + 1,
    });
    expect(spyOnConsole).toHaveBeenCalledWith(
      rollbackLevelOverMax
    );
  });
  it("Should return the target index", () => {
    [1, 2, 3, 5].forEach((rollbackLevel) =>
      expect(
        determineRollbackLevel({
          rollbackList,
          rollbackLevel,
        })
      ).toBe(rollbackLevel)
    );
  });
});
/* describe("buildRestoreFile", () => {
  it("Should extract all existing files that share the referenceId", () => {});
  it("Should inform user if files have fewer rollbacks than requested", ()=> {})
  it("Should return the expected list with current and earliest names", () => {});
}); */
/* 
describe.only("restoreFileMapper", () => {
  it("Should call determineRollbackLevel", ()=> {});
  it("Should call buildRestoreFile", ()=> {});
  it("Should populate the restoreList with found values", ()=> {});
  it("The order of single rename lists should not matter", ()=> {}); */
  
  /* it("Should run", () => {
    restoreFileMapper({ rollbackFile: newRenameListArray, rollbackLevel: 10 });
  }); 
});*/
