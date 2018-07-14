"use strict";

const thirdParty = require("../common/third-party");
const minimatch = require("minimatch");
const path = require("path");
const mem = require("mem");

const resolveEditorConfig = require("./resolve-config-editorconfig");

/**
 * @typedef {Object} LoadOptions
 * @property {boolean=} cache
 * @property {boolean} sync
 * @property {boolean=} editorconfig
 *
 * @typedef {null | { config: PrettierConfigFile, filepath: string }} LoadResult
 *
 * @typedef {(filePath: string, configPath?: string) => LoadResult} SyncLoadFunction
 * @typedef {(filePath: string, configPath?: string) => Promise<LoadResult>} AsyncLoadFunction
 */

const getExplorerMemoized = mem(opts =>
  thirdParty.cosmiconfig("prettier", {
    sync: opts.sync,
    cache: opts.cache,
    rcExtensions: true,
    transform: result => {
      if (result && result.config) {
        delete result.config.$schema;
      }
      return result;
    }
  })
);

/**
 * @param {LoadOptions} opts
 * @returns {SyncLoadFunction | AsyncLoadFunction}
 */
function getLoadFunction(opts) {
  // Normalize opts before passing to a memoized function
  opts = Object.assign({ sync: false, cache: false }, opts);
  return getExplorerMemoized(opts).load;
}

/**
 * @param {string} filePath
 * @param {ResolveConfigOptions} opts
 * @param {boolean} sync
 * @returns {MaybePromise<null | Partial<PrettierOptions>>}
 */
function _resolveConfig(filePath, opts, sync) {
  opts = Object.assign({ useCache: true }, opts);
  const loadOpts = {
    cache: !!opts.useCache,
    sync: !!sync,
    editorconfig: !!opts.editorconfig
  };
  const load = getLoadFunction(loadOpts);
  const loadEditorConfig = resolveEditorConfig.getLoadFunction(loadOpts);

  /**
   * @typedef {[LoadResult, import("editorconfig-to-prettier").Output]} LoadResultTuple
   */

  const arr = /** @type {LoadResultTuple} */ ([load, loadEditorConfig].map(l =>
    l(filePath, opts.config)
  ));

  /**
   * @param {LoadResultTuple} arr
   */
  const unwrapAndMerge = arr => {
    const result = arr[0];
    const editorConfigured = arr[1];
    const merged = Object.assign(
      {},
      editorConfigured,
      mergeOverrides(Object.assign({}, result), filePath)
    );

    /** @type {Array<"plugins" | "pluginSearchDirs">} */ ([
      "plugins",
      "pluginSearchDirs"
    ]).forEach(optionName => {
      const optionValue = merged[optionName];
      if (Array.isArray(optionValue)) {
        merged[optionName] = optionValue.map(
          value =>
            typeof value === "string" && value.startsWith(".") // relative path
              ? path.resolve(
                  path.dirname(
                    // TODO: remove this ignore when upgraded to 1.14
                    // prettier-ignore
                    /** @type {Exclude<LoadResult, null>} */ (result).filepath
                  ),
                  value
                )
              : value
        );
      }
    });

    if (!result && !editorConfigured) {
      return null;
    }

    return merged;
  };

  if (loadOpts.sync) {
    return unwrapAndMerge(arr);
  }

  return Promise.all(arr).then(unwrapAndMerge);
}

/**
 * @param {string} filePath
 * @param {ResolveConfigOptions} opts
 * @returns {Promise<Partial<PrettierOptions>>}
 */
const resolveConfig = (filePath, opts) =>
  /** @type {Promise<Partial<PrettierOptions>>} */ (_resolveConfig(
    filePath,
    opts,
    false
  ));

/**
 * @param {string} filePath
 * @param {ResolveConfigOptions} opts
 * @returns {Partial<PrettierOptions>}
 */
resolveConfig.sync = (filePath, opts) =>
  /** @type {Partial<PrettierOptions>} */ (_resolveConfig(
    filePath,
    opts,
    true
  ));

function clearCache() {
  mem.clear(getExplorerMemoized);
  resolveEditorConfig.clearCache();
}

/**
 * @param {string} filePath
 * @returns {Promise<null | string>}
 */
function resolveConfigFile(filePath) {
  const load = /** @type {AsyncLoadFunction} */ (getLoadFunction({
    sync: false
  }));
  return load(filePath).then(result => {
    return result ? result.filepath : null;
  });
}

/**
 * @param {string} filePath
 * @returns {null | string}
 */
resolveConfigFile.sync = filePath => {
  const load = /** @type {SyncLoadFunction} */ (getLoadFunction({
    sync: true
  }));
  const result = load(filePath);
  return result ? result.filepath : null;
};

/**
 * @param {{ config: PrettierConfigFile, filepath: string }} configResult
 * @param {string=} filePath
 * @returns {Partial<PrettierOptions>}
 */
function mergeOverrides(configResult, filePath) {
  const options = Object.assign({}, configResult.config);
  if (filePath && options.overrides) {
    const relativeFilePath = path.relative(
      path.dirname(configResult.filepath),
      filePath
    );
    for (const override of options.overrides) {
      if (
        pathMatchesGlobs(
          relativeFilePath,
          override.files,
          override.excludeFiles
        )
      ) {
        Object.assign(options, override.options);
      }
    }
  }

  delete options.overrides;
  return options;
}

/**
 * @param {string} filePath
 * @param {string | string[]} patterns
 * @param {(string | string[])=} excludedPatterns
 * @returns {boolean}
 */
// Based on eslint: https://github.com/eslint/eslint/blob/master/lib/config/config-ops.js
function pathMatchesGlobs(filePath, patterns, excludedPatterns) {
  const patternList = /** @type {string[]} */ ([]).concat(patterns);
  const excludedPatternList = /** @type {string[]} */ ([]).concat(
    excludedPatterns || []
  );
  const opts = { matchBase: true };

  return (
    patternList.some(pattern => minimatch(filePath, pattern, opts)) &&
    !excludedPatternList.some(excludedPattern =>
      minimatch(filePath, excludedPattern, opts)
    )
  );
}

module.exports = {
  resolveConfig,
  resolveConfigFile,
  clearCache
};
