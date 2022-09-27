/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */

const esModules = ["nanoid"].join("|");

export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  transform: {
    "\\.[jt]sx?$": ["ts-jest", {useESM: true}],
  },
  
  /* moduleNameMapper: {
    "(.+)\\.js": "$1",
  }, */
  extensionsToTreatAsEsm: [".ts"],
  maxWorkers: 1,
  coveragePathIgnorePatterns: ["tests/", "programConfiguration"],
  collectCoverageFrom: ["**/*.ts"],
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
  moduleNameMapper: {
    "(.+)\\.js": "$1",
    "^nanoid(/(.*)|$)": "nanoid$1",
}
};
