"use strict";

const estreePrinter = require("./printer-estree");
const estreeJsonPrinter = require("./printer-estree-json");
const options = require("./options");
const createLanguage = require("../utils/create-language");

const languages = [].concat(
  createLanguage(require("linguist-languages/data/javascript"), {
    override: {
      since: "0.0.0",
      parsers: ["babel", "flow"],
      vscodeLanguageIds: ["javascript"]
    },
    extend: {
      interpreters: ["nodejs"]
    }
  }),
  createLanguage(require("linguist-languages/data/javascript"), {
    override: {
      name: "Flow",
      since: "0.0.0",
      parsers: ["babel", "flow"],
      vscodeLanguageIds: ["javascript"],

      aliases: [],
      filenames: [],
      extensions: [".js.flow"]
    }
  }),
  createLanguage(require("linguist-languages/data/jsx"), {
    override: {
      since: "0.0.0",
      parsers: ["babel", "flow"],
      vscodeLanguageIds: ["javascriptreact"]
    }
  }),
  createLanguage(require("linguist-languages/data/typescript"), {
    override: {
      since: "1.4.0",
      parsers: ["typescript"],
      vscodeLanguageIds: ["typescript", "typescriptreact"]
    }
  }),
  createLanguage(require("linguist-languages/data/json"), {
    override: {
      name: "JSON.stringify",
      since: "1.13.0",
      parsers: ["json-stringify"],
      vscodeLanguageIds: ["json"],

      extensions: [], // .json file defaults to json instead of json-stringify
      filenames: ["package.json", "package-lock.json", "composer.json"]
    }
  }),
  ((linguistJsonData, linguistJsoncData) => {
    /**
     * Our `jsonc` refers to `JSON with Comments`, which is the format used by
     * VSCode `settings.json` and TypeScript `tsconfig.json`, it extends JSON to
     * allow comments and trailing commas.
     *
     * The `jsonc` in Linguist refers to JSON + comments, we cannot safely
     * use it for our `jsonc` since it may introduce invalid trailing commas, so
     * we hardcode filenames of our `jsonc` here.
     */
    const JSONC_FILENAMES = ["tsconfig.json"];
    return [
      createLanguage(linguistJsonData, {
        override: {
          since: "1.5.0",
          parsers: ["json"],
          vscodeLanguageIds: ["json"]
        },
        extend: {
          extensions: linguistJsoncData.extensions,
          filenames: [".prettierrc", ".eslintrc"].concat(
            linguistJsoncData.filenames.filter(
              filename => JSONC_FILENAMES.indexOf(filename) === -1
            )
          )
        }
      }),
      createLanguage(linguistJsoncData, {
        override: {
          since: "1.5.0",
          parsers: ["jsonc"],
          vscodeLanguageIds: ["jsonc"],
          filenames: JSONC_FILENAMES,
          extensions: []
        }
      })
    ];
  })(
    require("linguist-languages/data/json"),
    require("linguist-languages/data/json-with-comments")
  ),
  createLanguage(require("linguist-languages/data/json5"), {
    override: {
      since: "1.13.0",
      parsers: ["json5"],
      vscodeLanguageIds: ["json5"]
    }
  })
);

const printers = {
  estree: estreePrinter,
  "estree-json": estreeJsonPrinter
};

module.exports = {
  languages,
  options,
  printers
};
