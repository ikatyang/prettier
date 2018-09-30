"use strict";

const htmlStyles = require("html-styles");

const getCssStyleTags = property =>
  htmlStyles
    .filter(htmlStyle => htmlStyle.style[property])
    .map(htmlStyle =>
      htmlStyle.selectorText
        .split(",")
        .map(selector => selector.trim())
        .filter(selector => /^[a-zA-Z0-9]+$/.test(selector))
        .reduce((reduced, tagName) => {
          reduced[tagName] = htmlStyle.style[property];
          return reduced;
        }, {})
    )
    .reduce((reduced, value) => Object.assign(reduced, value), {});

const CSS_DISPLAY_TAGS = getCssStyleTags("display");
const CSS_DISPLAY_DEFAULT = "inline";

module.exports = {
  CSS_DISPLAY_TAGS,
  CSS_DISPLAY_DEFAULT
};
