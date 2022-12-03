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
  // eslint-disable-next-line no-useless-escape
  coveragePathIgnorePatterns: ["tests/", "programConfiguration", "index.ts", "/\.\w+/"],
  collectCoverageFrom: ["**/*.ts"],
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
};
