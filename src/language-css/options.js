"use strict";

const commonOptions = require("../common/common-options");
const CATEGORY_CSS = "CSS";

// format based on https://github.com/prettier/prettier/blob/master/src/main/core-options.js
module.exports = {
  "css/singleQuote": {
    since: "1.15.0",
    category: CATEGORY_CSS,
    type: "boolean",
    default: false,
    description: commonOptions.singleQuote.description
  }
};
