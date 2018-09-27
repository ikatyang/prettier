"use strict";

const { getLast } = require("../common/util");
const { mapNode, VOID_TAGS, isWhitespaceSensitiveTagNode } = require("./utils");
const LineAndColumn = (m => m.default || m)(require("lines-and-columns"));

const PREPROCESS_PIPELINE = [
  addStartAndEndLocation,
  addIsSelfClosingForVoidTags,
  extractWhitespaces,
  addShouldBreakOpenCloseTag,
  addParentPrevNext,
  debug
];

function debug(x) {
  // console.log(JSON.stringify(x));
  return x;
}

function preprocess(ast, options) {
  for (const fn of PREPROCESS_PIPELINE) {
    ast = fn(ast, options);
  }
  return ast;
}

/** add `startLocation` and `endLocation` field */
function addStartAndEndLocation(ast, options) {
  const locator = new LineAndColumn(options.originalText);
  return mapNode(ast, node => {
    const startLocation = locator.locationForIndex(options.locStart(node));
    const endLocation = locator.locationForIndex(options.locEnd(node) - 1);
    return Object.assign({}, node, { startLocation, endLocation });
  });
}

/** add `isSelfClosing` for void tags */
function addIsSelfClosingForVoidTags(ast /*, options */) {
  return mapNode(ast, node => {
    if (node.type === "tag" && node.name in VOID_TAGS) {
      return Object.assign({}, node, { isSelfClosing: true });
    }
    return node;
  });
}

/** add `hasLeadingSpaces`, `hasTrailingSpaces`, and `hasDanglingSpaces` field; and remove those whitespaces. */
function extractWhitespaces(ast /*, options*/) {
  const TYPE_WHITESPACE = "whitespace";
  return mapNode(ast, node => {
    if (!node.children || isWhitespaceSensitiveTagNode(node)) {
      return node;
    }

    if (
      node.children.length === 1 &&
      node.children[0].type === "text" &&
      node.children[0].data.trim().length === 0
    ) {
      return Object.assign({}, node, { hasDanglingSpaces: true });
    }

    const childrenWithWhitespaces = [];
    for (const child of node.children) {
      if (child.type !== "text") {
        childrenWithWhitespaces.push(child);
        continue;
      }

      const [_, leadingSpaces, text, trailingSpaces] = child.data.match(
        /^(\s*)([\s\S]*?)(\s*)$/
      );

      if (leadingSpaces) {
        childrenWithWhitespaces.push({ type: TYPE_WHITESPACE });
      }

      if (text) {
        childrenWithWhitespaces.push({
          type: "text",
          data: text,
          startIndex: child.startIndex + leadingSpaces.length,
          endIndex: child.endIndex - trailingSpaces.length
        });
      }

      if (trailingSpaces) {
        childrenWithWhitespaces.push({ type: TYPE_WHITESPACE });
      }
    }

    const children = [];
    for (let i = 0; i < childrenWithWhitespaces.length; i++) {
      const child = childrenWithWhitespaces[i];

      if (child.type === TYPE_WHITESPACE) {
        continue;
      }

      const hasLeadingSpaces =
        i !== 0 && childrenWithWhitespaces[i - 1].type === TYPE_WHITESPACE;

      const hasTrailingSpaces =
        i !== childrenWithWhitespaces.length - 1 &&
        childrenWithWhitespaces[i + 1].type === TYPE_WHITESPACE;

      children.push(
        Object.assign({}, child, { hasLeadingSpaces, hasTrailingSpaces })
      );
    }

    return Object.assign({}, node, { children });
  });
}

function addShouldBreakOpenCloseTag(ast /*, options */) {
  return mapNode(ast, (node, index, parentNode) => {
    let shouldBreakOpeningTagByFirstChild = false;
    let shouldBreakOpeningTagByPrevNode = false;
    let shouldBreakClosingTagByLastChild = false;
    let shouldBreakClosingTagByNextNode = false;

    if (node.type !== "root" && node.type !== "text") {
      if (!node.hasLeadingSpaces && parentNode.children[index - 1]) {
        shouldBreakOpeningTagByPrevNode = true;
      }

      if (!node.hasTrailingSpaces && parentNode.children[index + 1]) {
        shouldBreakClosingTagByNextNode = true;
      }

      if (node.children && node.children.length !== 0) {
        if (!node.children[0].hasLeadingSpaces) {
          shouldBreakOpeningTagByFirstChild = true;
        }

        if (!getLast(node.children).hasTrailingSpaces) {
          shouldBreakClosingTagByLastChild = true;
        }
      }
    }

    return Object.assign({}, node, {
      shouldBreakOpeningTagByFirstChild,
      shouldBreakOpeningTagByPrevNode,
      shouldBreakClosingTagByLastChild,
      shouldBreakClosingTagByNextNode
    });
  });
}

function addParentPrevNext(ast /*, options */) {
  function _addParentPrevNext(node, parent, index) {
    const prev = index === -1 ? null : parent.children[index - 1];
    const next = index === -1 ? null : parent.children[index + 1];

    Object.defineProperties(node, {
      parent: { value: parent, enumerable: false },
      prev: { value: prev, enumerable: false },
      next: { value: next, enumerable: false }
    });

    if (node.children) {
      node.children.forEach((child, childIndex) =>
        _addParentPrevNext(child, node, childIndex)
      );
    }
  }

  _addParentPrevNext(ast, null, -1);
  return ast;
}

module.exports = preprocess;
