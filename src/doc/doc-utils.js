"use strict";

/**
 * @param {Doc} doc
 * @param {((doc: Doc) => void | boolean)=} onEnter
 * @param {((doc: Doc) => void)=} onExit
 * @param {boolean=} shouldTraverseConditionalGroups
 */
function traverseDoc(doc, onEnter, onExit, shouldTraverseConditionalGroups) {
  /**
   * @param {Doc} doc
   */
  function traverseDocRec(doc) {
    let shouldRecurse = true;
    if (onEnter) {
      if (onEnter(doc) === false) {
        shouldRecurse = false;
      }
    }

    if (shouldRecurse && typeof doc !== "string") {
      if (doc.type === "concat" || doc.type === "fill") {
        for (let i = 0; i < doc.parts.length; i++) {
          traverseDocRec(doc.parts[i]);
        }
      } else if (doc.type === "if-break") {
        if (doc.breakContents) {
          traverseDocRec(doc.breakContents);
        }
        if (doc.flatContents) {
          traverseDocRec(doc.flatContents);
        }
      } else if (doc.type === "group" && doc.expandedStates) {
        if (shouldTraverseConditionalGroups) {
          doc.expandedStates.forEach(traverseDocRec);
        } else {
          traverseDocRec(doc.contents);
        }
      } else if ("contents" in doc) {
        traverseDocRec(doc.contents);
      }
    }

    if (onExit) {
      onExit(doc);
    }
  }

  traverseDocRec(doc);
}

/**
 * @param {Doc} doc
 * @param {(doc: Doc) => Doc} cb
 * @returns {Doc}
 */
function mapDoc(doc, cb) {
  if (typeof doc === "string") {
    return cb(doc);
  }

  if (doc.type === "concat" || doc.type === "fill") {
    const parts = doc.parts.map(part => mapDoc(part, cb));
    return cb(Object.assign({}, doc, { parts }));
  } else if (doc.type === "if-break") {
    const breakContents = doc.breakContents && mapDoc(doc.breakContents, cb);
    const flatContents = doc.flatContents && mapDoc(doc.flatContents, cb);
    return cb(Object.assign({}, doc, { breakContents, flatContents }));
  } else if ("contents" in doc) {
    const contents = mapDoc(doc.contents, cb);
    return cb(Object.assign({}, doc, { contents }));
  }

  return cb(doc);
}

/**
 * @param {Doc} doc
 * @param {(doc: Doc) => void | any} fn
 * @param {any} defaultValue
 */
function findInDoc(doc, fn, defaultValue) {
  let result = defaultValue;
  let hasStopped = false;
  traverseDoc(doc, doc => {
    const maybeResult = fn(doc);
    if (maybeResult !== undefined) {
      hasStopped = true;
      result = maybeResult;
    }
    if (hasStopped) {
      return false;
    }
  });
  return result;
}

/**
 * @param {Doc} n
 */
function isEmpty(n) {
  return typeof n === "string" && n.length === 0;
}

/**
 * @param {Doc} doc
 * @returns {boolean}
 */
function isLineNext(doc) {
  return findInDoc(
    doc,
    doc => {
      if (typeof doc === "string") {
        return false;
      }
      if (doc.type === "line") {
        return true;
      }
    },
    false
  );
}

/**
 * @param {Doc} doc
 * @returns {boolean}
 */
function willBreak(doc) {
  return findInDoc(
    doc,
    doc => {
      if (typeof doc !== "string") {
        if (doc.type === "group" && doc.break) {
          return true;
        }
        if (doc.type === "line" && doc.hard) {
          return true;
        }
        if (doc.type === "break-parent") {
          return true;
        }
      }
    },
    false
  );
}

/**
 * @param {Group[]} groupStack
 */
function breakParentGroup(groupStack) {
  if (groupStack.length > 0) {
    const parentGroup = groupStack[groupStack.length - 1];
    // Breaks are not propagated through conditional groups because
    // the user is expected to manually handle what breaks.
    if (!parentGroup.expandedStates) {
      parentGroup.break = true;
    }
  }
  return null;
}

/**
 * @param {Doc} doc
 */
function propagateBreaks(doc) {
  const alreadyVisited = new Map();
  /** @type {Group[]} */
  const groupStack = [];
  traverseDoc(
    doc,
    doc => {
      if (typeof doc !== "string") {
        if (doc.type === "break-parent") {
          breakParentGroup(groupStack);
        }
        if (doc.type === "group") {
          groupStack.push(doc);
          if (alreadyVisited.has(doc)) {
            return false;
          }
          alreadyVisited.set(doc, true);
        }
      }
    },
    doc => {
      if (typeof doc !== "string" && doc.type === "group") {
        const group = /** @type {Group} */ (groupStack.pop());
        if (group.break) {
          breakParentGroup(groupStack);
        }
      }
    },
    /* shouldTraverseConditionalGroups */ true
  );
}

/**
 * @param {Doc} doc
 * @return {Doc}
 */
function removeLines(doc) {
  // Force this doc into flat mode by statically converting all
  // lines into spaces (or soft lines into nothing). Hard lines
  // should still output because there's too great of a chance
  // of breaking existing assumptions otherwise.
  return mapDoc(doc, d => {
    if (typeof d !== "string") {
      if (d.type === "line" && !d.hard) {
        return d.soft ? "" : " ";
      } else if (d.type === "if-break") {
        return d.flatContents || "";
      }
    }
    return d;
  });
}

/**
 * @param {Doc} doc
 * @returns {Doc}
 */
function stripTrailingHardline(doc) {
  // HACK remove ending hardline, original PR: #1984
  if (typeof doc !== "string") {
    if (doc.type === "concat" && doc.parts.length === 2) {
      const lastPart = doc.parts[1];
      if (
        typeof lastPart !== "string" &&
        lastPart.type === "concat" &&
        lastPart.parts.length === 2
      ) {
        const firstPartInLastPart = lastPart.parts[0];
        const lastPartInLastPart = lastPart.parts[1];
        if (
          typeof firstPartInLastPart !== "string" &&
          firstPartInLastPart.type === "line" &&
          firstPartInLastPart.hard &&
          typeof lastPartInLastPart !== "string" &&
          lastPartInLastPart.type === "break-parent"
        ) {
          return doc.parts[0];
        }
      }
    }
  }
  return doc;
}

module.exports = {
  isEmpty,
  willBreak,
  isLineNext,
  traverseDoc,
  mapDoc,
  propagateBreaks,
  removeLines,
  stripTrailingHardline
};
