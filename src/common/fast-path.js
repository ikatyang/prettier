"use strict";

/**
 * @template T
 */
class FastPath {
  /**
   * @param {T} value
   */
  constructor(value) {
    /** @type {Array<T | T[] | PropertyKey>} */
    this.stack = [value];
  }

  // The name of the current property is always the penultimate element of
  // this.stack, and always a String.
  /**
   * @returns {PropertyKey | null}
   */
  getName() {
    const s = this.stack;
    const len = s.length;
    if (len > 1) {
      return /** @type {PropertyKey} */ (s[len - 2]);
    }
    // Since the name is always a string, null is a safe sentinel value to
    // return if we do not know the name of the (root) value.
    /* istanbul ignore next */
    return null;
  }

  // The value of the current property is always the final element of
  // this.stack.
  /**
   * @returns {T}
   */
  getValue() {
    const s = this.stack;
    return /** @type {T} */ (s[s.length - 1]);
  }

  /**
   * @param {number=} count
   * @returns {T | null}
   */
  getNode(count) {
    return getNodeHelper(
      this,
      // @ts-ignore
      ~~count
    );
  }

  /**
   * @param {number=} count
   * @returns {T | null}
   */
  getParentNode(count) {
    return getNodeHelper(
      this,
      // @ts-ignore
      ~~count + 1
    );
  }

  // Temporarily push properties named by string arguments given after the
  // callback function onto this.stack, then call the callback with a
  // reference to this (modified) FastPath object. Note that the stack will
  // be restored to its original state after the callback is finished, so it
  // is probably a mistake to retain a reference to the path.
  /**
   * @template U
   * @param {(x: any) => U} callback
   * @param {...PropertyKey} names
   * @returns {U}
   */
  // eslint-disable-next-line no-unused-vars
  call(callback, names) {
    const s = this.stack;
    const origLen = s.length;
    let value = s[origLen - 1];
    const argc = arguments.length;
    for (let i = 1; i < argc; ++i) {
      const name = arguments[i];
      // @ts-ignore
      value = value[name];
      s.push(name, value);
    }
    const result = callback(this);
    s.length = origLen;
    return result;
  }

  // Similar to FastPath.prototype.call, except that the value obtained by
  // accessing this.getValue()[name1][name2]... should be array-like. The
  // callback will be called with a reference to this path object for each
  // element of the array.
  /**
   * @param {(x: any) => void} callback
   * @param {...PropertyKey} names
   */
  // eslint-disable-next-line no-unused-vars
  each(callback, names) {
    const s = this.stack;
    const origLen = s.length;
    let value = s[origLen - 1];
    const argc = arguments.length;

    for (let i = 1; i < argc; ++i) {
      const name = arguments[i];
      // @ts-ignore
      value = value[name];
      s.push(name, value);
    }

    const array = /** @type {T[]} */ (value);

    for (let i = 0; i < array.length; ++i) {
      if (i in array) {
        s.push(i, array[i]);
        // If the callback needs to know the value of i, call
        // path.getName(), assuming path is the parameter name.
        callback(this);
        s.length -= 2;
      }
    }

    s.length = origLen;
  }

  // Similar to FastPath.prototype.each, except that the results of the
  // callback function invocations are stored in an array and returned at
  // the end of the iteration.
  /**
   * @template U
   * @param {(x: any, index: number) => U} callback
   * @param {...PropertyKey} names
   * @returns {U[]}
   */
  // eslint-disable-next-line no-unused-vars
  map(callback, names) {
    const s = this.stack;
    const origLen = s.length;
    let value = s[origLen - 1];
    const argc = arguments.length;

    for (let i = 1; i < argc; ++i) {
      const name = arguments[i];
      // @ts-ignore
      value = value[name];
      s.push(name, value);
    }

    const array = /** @type {T[]} */ (value);

    const result = new Array(array.length);

    for (let i = 0; i < array.length; ++i) {
      if (i in array) {
        s.push(i, array[i]);
        result[i] = callback(this, i);
        s.length -= 2;
      }
    }

    s.length = origLen;

    return result;
  }
}

/**
 * @template T
 * @param {FastPath<T>} path
 * @param {number} count
 * @returns {T | null}
 */
function getNodeHelper(path, count) {
  const s = path.stack;

  for (let i = s.length - 1; i >= 0; i -= 2) {
    const value = s[i];

    if (value && !Array.isArray(value) && --count < 0) {
      return /** @type {T} */ (value);
    }
  }

  return null;
}

module.exports = FastPath;
