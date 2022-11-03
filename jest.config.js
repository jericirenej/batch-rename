/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */

const esModules = ["nanoid"].join("|");

export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  transform: {
    "\\.[jt]sx?$": "ts-jest",
  },
 moduleNameMapper: {
    "(.+)\\.js": "$1",
  },
  
  extensionsToTreatAsEsm: [".ts"],
  maxWorkers: 1,
  coveragePathIgnorePatterns: ["tests/", "programConfiguration"],
  collectCoverageFrom: ["**/*.ts"],
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
};
