const js = require("@eslint/js")

module.exports = [
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
]
