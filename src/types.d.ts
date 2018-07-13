type Doc =
  | string & { type?: undefined }
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

interface PrinterOptions {
  useTabs: boolean;
  tabWidth: number;
  printWidth: number;
  newLine: string;

  //
  parser: string;
  singleQuote: boolean;
  proseWrap: "preserve" | "always" | "never";
}
