"use strict";

const path = require("path");

const editorconfig = require("editorconfig");
const mem = require("mem");
const editorConfigToPrettier = require("editorconfig-to-prettier");
const findProjectRoot = require("find-project-root");

/**
 * @template T
 * @param {string=} filePath
 * @param {string=} configPath
 * @param {(filePath: string, opts?: any) => T} parse
 * @returns {undefined | T}
 */
const maybeParse = (filePath, configPath, parse) => {
  if (!filePath) {
    return undefined;
  }

  const root = findProjectRoot(path.dirname(path.resolve(filePath)));
  return parse(filePath, { root });
};

/**
 * @param {string=} filePath
 * @param {string=} configPath
 */
const editorconfigAsyncNoCache = (filePath, configPath) => {
  return Promise.resolve(
    // @ts-ignore
    maybeParse(filePath, configPath, editorconfig.parse)
  ).then(editorConfigToPrettier);
};
const editorconfigAsyncWithCache = mem(editorconfigAsyncNoCache);

/**
 * @param {string=} filePath
 * @param {string=} configPath
 */
const editorconfigSyncNoCache = (filePath, configPath) => {
  return editorConfigToPrettier(
    maybeParse(filePath, configPath, editorconfig.parseSync)
  );
};
const editorconfigSyncWithCache = mem(editorconfigSyncNoCache);

/**
 * @param {{ editorconfig: boolean, sync: boolean, cache: boolean }} opts
 * @returns {(filePath: string, configPath?: string) => MaybePromise<null | import("editorconfig-to-prettier").Output>}
 */
function getLoadFunction(opts) {
  if (!opts.editorconfig) {
    return () => null;
  }

  if (opts.sync) {
    return opts.cache ? editorconfigSyncWithCache : editorconfigSyncNoCache;
  }

  return opts.cache ? editorconfigAsyncWithCache : editorconfigAsyncNoCache;
}

function clearCache() {
  mem.clear(editorconfigSyncWithCache);
  mem.clear(editorconfigAsyncWithCache);
}

module.exports = {
  getLoadFunction,
  clearCache
};
