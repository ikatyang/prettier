declare module "cosmiconfig" {
  function cosmiconfig(
    moduleName: string,
    options?: Options
  ): SyncExplorer | AsyncExplorer;

  interface Options {
    moduleName?: string;
    packageProp?: string | false;
    rc?: string | false;
    js?: string | false;
    rcStrictJson?: boolean;
    rcExtensions?: boolean;
    stopDir?: string;
    cache?: boolean;
    sync?: boolean;
    transform?: (result: { config: any; filepath: string }) => any;
    configPath?: string;
    format?: "json" | "yaml" | "js";
  }

  interface Explorer {
    load(searchPath?: string, configPath?: string): any;
    clearFileCache(): void;
    clearDirectoryCache(): void;
    clearCaches(): void;
  }

  interface SyncExplorer extends Explorer {
    load(
      searchPath?: string,
      configPath?: string
    ): null | { config: any; filepath: string };
  }

  interface AsyncExplorer extends Explorer {
    load(
      searchPath?: string,
      configPath?: string
    ): Promise<null | { config: any; filepath: string }>;
  }

  export = cosmiconfig;
}
