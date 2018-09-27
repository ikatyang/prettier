"use strict";

const embed = require("./embed");
const clean = require("./clean");
const {
  builders: {
    breakParent,
    concat,
    group,
    dedent,
    hardline,
    ifBreak,
    indent,
    join,
    line,
    softline
  },
  debug: { printDocToDebug }
} = require("../doc");
const { getLast } = require("../common/util");
const { hasPrettierIgnore, identity } = require("./utils");
const preprocess = require("./preprocess");

const debug = x => {
  // console.log(printDocToDebug(x));
  return x;
};

function genericPrint(path, options, print) {
  const node = path.getValue();

  switch (node.type) {
    case "root":
      return node.children.length === 0
        ? ""
        : debug(concat([group(printChildren(path, print, options)), hardline]));
    case "directive": //TODO
      return concat([
        "<",
        node.name === "!doctype"
          ? node.data
              .replace(/\s+/g, " ")
              .replace(
                /^(!doctype)(( html)?)/i,
                (_, doctype, doctypeHtml) =>
                  doctype.toUpperCase() + doctypeHtml.toLowerCase()
              )
          : node.data,
        ">"
      ]);
    case "text": {
      // if (isWhitespaceSensitiveTagNode(parentNode)) {
      //   return concat(
      //     node.data
      //       .split(/(\n)/g)
      //       .map((x, i) => (i % 2 === 1 ? dedentToRoot(hardline) : x))
      //   );
      // }

      return concat([
        printOpeningTagPrefix(node),
        node.data.replace(/\s+/g, " ").trim(),
        printClosingTagSuffix(node)
      ]);
    }
    case "script":
    case "style":
    case "tag": {
      const openingTagDoc = printOpeningTag(path, options, print);

      if (node.isSelfClosing) {
        return group(openingTagDoc);
      }

      const closingTagDoc = printClosingTag(node);

      if (node.children.length === 0) {
        return group(concat([openingTagDoc, closingTagDoc]));
      }

      const containsTag = node.children.some(
        childNode => childNode.type !== "text"
      );

      const shouldGroupClosingTag =
        !node.shouldBreakClosingTagByLastChild &&
        node.shouldBreakClosingTagByNextNode;

      const isDoubleBreakEnd =
        node.shouldBreakClosingTagByLastChild &&
        node.parent.shouldBreakClosingTagByLastChild;

      const isDoubleBreakEnd2 =
        node.shouldBreakClosingTagByLastChild &&
        getLast(node.children).shouldBreakClosingTagByLastChild;

      const endPart = concat([
        (isDoubleBreakEnd2 && !isDoubleBreakEnd) ||
        (!closingTagDoc && node.next)
          ? ""
          : softline,
        // "#",
        // node.name || "null",
        // "{",
        closingTagDoc
        // "|",
        // node.name || "null",
        // "}",
        // ")"
      ]);

      return concat([
        group(
          concat([
            containsTag ? breakParent : "",
            // "(",
            // "[",
            openingTagDoc,
            // "]",
            printChildren(path, print),
            // !shouldGroupClosingTag
            //   ? ""
            //   :
            isDoubleBreakEnd ? "" : endPart
            // isDoubleBreakEnd ? "" : "666"
          ])
        ),
        isDoubleBreakEnd ? dedent(endPart) : ""
        // isDoubleBreakEnd ? "123" : ""
        // shouldGroupClosingTag
        //   ? ""
        //   : concat([
        //       !closingTagDoc && node.next ? "" : dedent(softline),
        //       "#",
        //       "{",
        //       closingTagDoc,
        //       "|",
        //       node.name || "null",
        //       "}",
        //       ")"
        //     ])
      ]);

      // const forceBreak = node.children.some(
      //   childNode => childNode.type !== "text"
      // );

      // return group(
      //   concat([
      //     group(openingTagDoc),
      //     concat([
      //       indent(concat([softline, printChildren(path, print, options)])),
      //       softline
      //     ]),
      //     closingTagDoc
      //   ])
      // );
    }
    case "comment": //TODO
      return concat(["<!--", node.data, "-->"]);
    case "attribute":
      return node.value === null
        ? node.key
        : concat([
            node.key,
            '="',
            node.value.replace(/"/g, "&quot;"),
            '"',
            node.value.includes("\n") ? breakParent : ""
          ]);
    // front matter
    case "yaml":
    case "toml":
      return node.raw;
    default:
      /* istanbul ignore next */
      throw new Error("unknown htmlparser2 type: " + node.type);
  }
}

function printOpeningTag(path, options, print) {
  const node = path.getValue();

  if (
    node.shouldBreakOpeningTagByFirstChild &&
    node.shouldBreakOpeningTagByPrevNode
  ) {
    /**
     *     123<p  <-- at prev close tag
     *     | attr <-- at open tag
     *       >    <-- at firstChild open tag
     *
     *     ><p    <-- at open tag
     *     | attr <-- at open tag
     *       >    <-- at firstChild open tag
     */
    return concat([
      printClosingTagEndMarker(node.prev),
      node.prev.type === "text" ? "" : concat(["<", node.name]),
      node.attributes.length === 0
        ? ""
        : indent(
            concat([hardline, group(join(line, path.map(print, "attributes")))])
          )
    ]);
  }

  if (node.shouldBreakOpeningTagByFirstChild) {
    /**
     *     <p     <-- at open tag
     *     | attr <-- at open tag
     *       >    <-- at firstChild open tag
     */
    return concat([
      printOpeningTagPrefix(node),
      "<",
      node.name,
      node.attributes.length === 0
        ? ""
        : indent(
            concat([hardline, group(join(line, path.map(print, "attributes")))])
          )
    ]);
  }

  if (node.shouldBreakOpeningTagByPrevNode) {
    /**
     *     123<p  <-- at prev close tag
     *     | attr <-- at open tag
     *     >      <-- at open tag
     *
     *     ><p    <-- at open tag
     *     | attr <-- at open tag
     *     >      <-- at open tag
     */
    return concat([
      printClosingTagEndMarker(node.prev),
      node.prev.type === "text" ? "" : concat(["<", node.name]),
      node.attributes.length === 0
        ? ""
        : concat([
            printIndent(options),
            group(join(line, path.map(print, "attributes"))),
            hardline
          ]),
      printClosingTagEndMarker(node),
      node.isSelfClosing ? printClosingTagSuffix(node) : ""
    ]);
  }

  const forceSingeLine =
    node.attributes.length === 0 ||
    (node.attributes.length === 1 &&
      (!node.attributes[0].value || !node.attributes[0].value.includes("\n")));

  return concat([
    printOpeningTagPrefix(node),
    "<",
    node.name,
    group(
      indent(
        concat([
          forceSingeLine ? (node.attributes.length === 0 ? "" : " ") : line,
          join(line, path.map(print, "attributes"))
        ])
      )
    ),
    forceSingeLine
      ? concat([
          node.isSelfClosing
            ? concat([" />", printClosingTagSuffix(node)])
            : ">"
        ])
      : concat([
          softline,
          node.isSelfClosing
            ? concat([ifBreak("", " "), "/>", printClosingTagSuffix(node)])
            : ">"
        ])
  ]);
}

function printClosingTag(node) {
  if (
    node.shouldBreakClosingTagByLastChild &&
    node.shouldBreakClosingTagByNextNode
  ) {
    /**
     *     <p
     *       >123</p <-- at lastChild close tag
     *     ><div     <-- at next open tag
     */
    return "";
  }

  if (node.shouldBreakClosingTagByLastChild) {
    /**
     *     <p
     *       >123</p <-- at lastChild close tag
     *     >         <-- at close tag
     */
    return concat([">", printClosingTagSuffix(node)]);
  }

  if (node.shouldBreakClosingTagByNextNode) {
    /**
     *     <p>
     *       123
     *     </p   <-- at close tag
     *     ><div <-- at next open tag
     */
    return concat(["</", node.name]);
  }

  return concat(["</", node.name, ">", printClosingTagSuffix(node)]);
}

function printIndent(options) {
  return options.useTabs ? "\t" : " ".repeat(options.tabWidth);
}

function printOpeningTagPrefix(node) {
  if (node.prev) {
    if (node.prev.shouldBreakClosingTagByNextNode) {
      return printClosingTagEndMarker(node.prev);
    }
  } else {
    if (node.parent.shouldBreakOpeningTagByFirstChild) {
      return printClosingTagEndMarker(node.parent);
    }
  }

  return "";
}

function printClosingTagSuffix(node) {
  if (node.next) {
    if (node.next.shouldBreakOpeningTagByPrevNode) {
      return node.next.type === "text" ? "" : concat(["<", node.next.name]);
    }
  } else {
    if (node.parent.shouldBreakClosingTagByLastChild) {
      return concat(["</", node.parent.name]);
    }
  }

  return "";
}

function printClosingTagEndMarker(node) {
  return node.type === "text" ? "" : node.isSelfClosing ? "/>" : ">";
}

function printChildren(path, print /*, options*/) {
  const node = path.getValue();

  const parts = [];

  path.map((childPath, childIndex) => {
    const childNode = childPath.getValue();

    // if (childIndex !== 0) {
    //   parts.push(softline);
    // }

    parts.push(
      (node.type === "root" ? identity : indent)(
        concat([
          childNode.shouldBreakOpeningTagByPrevNode &&
          childNode.attributes &&
          childNode.attributes.length !== 0
            ? ""
            : softline,
          // "@",
          print(childPath)
        ])
      )
    );

    // parts.push(
    //   (node.type === "root" ? identity : indent)(
    //     concat([
    //       childNode.hasLeadingSpaces
    //         ? line
    //         : (childIndex === 0
    //           ? node.shouldBreakOpeningTagByFirstChild
    //           : childNode.prev.shouldBreakClosingTagByNextNode)
    //           ? softline
    //           : "",
    //       print(childPath)
    //     ])
    //   )
    // );

    // if (childIndex === node.children.length - 1) {
    //   parts.push(
    //     childNode.hasTrailingSpaces
    //       ? line
    //       : node.shouldBreakClosingTagByLastChild
    //         ? softline
    //         : ""
    //   );
    // }
  }, "children");

  return concat(parts);
}

module.exports = {
  preprocess,
  print: genericPrint,
  massageAstNode: clean,
  embed,
  hasPrettierIgnore
};
