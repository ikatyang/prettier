declare module "editorconfig-to-prettier" {
  function editorConfigToPrettier(
    editorConfig?: editorConfigToPrettier.Input
  ): editorConfigToPrettier.Output;

  namespace editorConfigToPrettier {
    interface Input {
      indent_style?: any;
      indent_size?: any;
      tab_width?: any;
      max_line_length?: any;
      quote_type?: any;
    }

    interface Output {
      useTabs?: boolean;
      tabWidth?: number;
      printWidth?: number;
      singleQuote?: boolean;
    }
  }

  export = editorConfigToPrettier;
}
