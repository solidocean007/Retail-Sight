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
    project: "./tsconfig.json",  // ✅ move it here
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "import", "prettier"],
  ignorePatterns: [
    ".eslintrc.js",
    "/lib/**/*",
  ],
  rules: {
    quotes: ["error", "double"],
    indent: ["error", 2],
    "linebreak-style": ["error", "unix"],
    "max-len": ["error", { code: 120 }],
    "prettier/prettier": ["error"],
    curly: ["error", "all"],
    "import/no-unresolved": 0,
  }
};
