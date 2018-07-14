declare module "find-project-root" {
  /**
   * Finds the project root by custom markers
   */
  function findProjectRoot(path: string, options?: Options): null | string;

  interface Options {
    /**
     * total number of levels the algorithm can traverse
     */
    maxDepth?: number;
    /**
     * markers that it will search for
     */
    markers?: string[];
  }

  export = findProjectRoot;
}
