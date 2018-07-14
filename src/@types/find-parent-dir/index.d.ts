declare module "find-parent-dir" {
  function findParentDir(
    currentFullPath: string,
    clue: string,
    cb: (err: any, dir: string | null) => void
  ): void;
  namespace findParentDir {
    function sync(currentFullPath: string, clue: string): string | null;
  }
  export = findParentDir;
}
