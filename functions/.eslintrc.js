module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
  ],
  plugins: ["@typescript-eslint", "import", "prettier"],
  rules: {
    quotes: ["error", "double"],
    "import/no-unresolved": 0,
    indent: ["error", 2],
    "linebreak-style": ["error", "unix"],
    "max-len": ["error", { code: 120 }],
    "prettier/prettier": ["error"], // Add this line
    curly: ["error", "all"], // Add this line for curly brace spacing
  },
  overrides: [
    {
      files: ["functions/**/*.ts"],
      parserOptions: {
        project: ["./functions/tsconfig.json"],
      },
    },
  ],
};
