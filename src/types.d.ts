type MaybePromise<T> = T | Promise<T>;

//==============================================================================

type Doc =
  | string
  | Align
  | BreakParent
  | Concat
  | Cursor
  | Fill
  | Group
  | IfBreak
  | Indent
  | Line
  | LineSuffix
  | LineSuffixBoundary;

interface Align {
  type: "align";
  n: number | string | { type: "root" };
  contents: Doc;
}

interface BreakParent {
  type: "break-parent";
}

interface Concat {
  type: "concat";
  parts: Doc[];
}

interface Cursor {
  type: "cursor";
  placeholder: symbol;
}

interface Fill {
  type: "fill";
  parts: Doc[];
}

interface Group {
  type: "group";
  contents: Doc;
  break: boolean;
  expandedStates?: Doc[];
  id?: GroupId;
}

type GroupId = any;

interface IfBreak {
  type: "if-break";
  breakContents: Doc;
  flatContents?: Doc;
  groupId?: GroupId;
}

interface Indent {
  type: "indent";
  contents: Doc;
}

interface Line {
  type: "line";
  soft?: boolean;
  hard?: boolean;
  literal?: boolean;
}

interface LineSuffix {
  type: "line-suffix";
  contents: Doc;
}

interface LineSuffixBoundary {
  type: "line-suffix-boundary";
}

//==============================================================================

type FastPathContructor = typeof import("./common/fast-path");
type FastPath<T = any> = import("./common/fast-path")<T>;

//==============================================================================

interface DocPrinterOptions {
  useTabs: boolean;
  tabWidth: number;
  printWidth: number;
  newLine: string;
}

interface CoreOptions extends DocPrinterOptions {
  parser: string;
}

interface CommonOptions {
  singleQuote: boolean;
  proseWrap: "preserve" | "always" | "never";
}

interface PrettierOptions extends CoreOptions, CommonOptions {
  plugins: string[];
  pluginSearchDirs: string[];
}

interface PrinterOptions extends PrettierOptions {
  superParser?: string;
}

interface PrettierConfigFile extends Partial<PrettierOptions> {
  overrides?: Array<{
    files: string | string[];
    excludeFiles?: string | string[];
    options: Partial<PrettierOptions>;
  }>;
}

interface ResolveConfigOptions {
  config?: string;
  useCache?: boolean;
  editorconfig?: boolean;
}