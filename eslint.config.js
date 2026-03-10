import js from "@eslint/js";

export default [
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "out/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "readonly",
        console: "readonly",
        process: "readonly",
      },
    },
  },
];
