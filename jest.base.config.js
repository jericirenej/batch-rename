const jestConfig = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testRegex: ["/tests/.*spec.ts$"],
  extensionsToTreatAsEsm: [".ts"],
  maxWorkers: 2,
  moduleNameMapper: { "(.+)\\.js": "$1","^@batch-rename/(.*)$": "<rootDir>/packages/$1/src" },
};

export default jestConfig;
