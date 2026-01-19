/**
 * Code printer utilities for generating formatted TypeScript code
 */

/** Indentation settings */
export interface IndentOptions {
  size: number;
  char: ' ' | '\t';
}

const DEFAULT_INDENT: IndentOptions = {
  size: 2,
  char: ' ',
};

/**
 * Code printer class for building formatted code strings
 */
export class CodePrinter {
  private _lines: string[] = [];
  private currentIndent = 0;
  private indentStr: string;

  constructor(options: IndentOptions = DEFAULT_INDENT) {
    this.indentStr = options.char.repeat(options.size);
  }

  /**
   * Add a line of code
   */
  line(code = ''): this {
    if (code === '') {
      this._lines.push('');
    } else {
      this._lines.push(this.getIndent() + code);
    }
    return this;
  }

  /**
   * Add multiple lines
   */
  addLines(codes: string[]): this {
    for (const code of codes) {
      this.line(code);
    }
    return this;
  }

  /**
   * Add code without a newline
   */
  append(code: string): this {
    if (this._lines.length === 0) {
      this._lines.push(this.getIndent() + code);
    } else {
      this._lines[this._lines.length - 1] += code;
    }
    return this;
  }

  /**
   * Increase indentation
   */
  indent(): this {
    this.currentIndent++;
    return this;
  }

  /**
   * Decrease indentation
   */
  dedent(): this {
    this.currentIndent = Math.max(0, this.currentIndent - 1);
    return this;
  }

  /**
   * Add a block with opening and closing braces
   */
  block(header: string, content: () => void, closingBrace = '}'): this {
    this.line(`${header} {`);
    this.indent();
    content();
    this.dedent();
    this.line(closingBrace);
    return this;
  }

  /**
   * Add an interface declaration
   */
  interface(name: string, content: () => void): this {
    return this.block(`export interface ${name}`, content);
  }

  /**
   * Add a type alias
   */
  typeAlias(name: string, type: string): this {
    return this.line(`export type ${name} = ${type};`);
  }

  /**
   * Add a const declaration
   */
  const(name: string, value: string, type?: string): this {
    const typeAnnotation = type ? `: ${type}` : '';
    return this.line(`export const ${name}${typeAnnotation} = ${value};`);
  }

  /**
   * Add a function declaration
   */
  func(
    name: string,
    params: string,
    returnType: string,
    content: () => void,
    exported = true
  ): this {
    const exportKeyword = exported ? 'export ' : '';
    return this.block(`${exportKeyword}function ${name}(${params}): ${returnType}`, content);
  }

  /**
   * Add an arrow function
   */
  arrowFunc(name: string, params: string, returnType: string, body: string, exported = true): this {
    const exportKeyword = exported ? 'export ' : '';
    return this.line(`${exportKeyword}const ${name} = (${params}): ${returnType} => ${body};`);
  }

  /**
   * Add an import statement
   */
  import(items: string | string[], from: string): this {
    const importItems = Array.isArray(items) ? items.join(', ') : items;
    return this.line(`import { ${importItems} } from '${from}';`);
  }

  /**
   * Add a type import statement
   */
  importType(items: string | string[], from: string): this {
    const importItems = Array.isArray(items) ? items.join(', ') : items;
    return this.line(`import type { ${importItems} } from '${from}';`);
  }

  /**
   * Add a default import statement
   */
  importDefault(name: string, from: string): this {
    return this.line(`import ${name} from '${from}';`);
  }

  /**
   * Add a comment
   */
  comment(text: string): this {
    return this.line(`// ${text}`);
  }

  /**
   * Add a JSDoc comment
   */
  jsdoc(lines: string[]): this {
    this.line('/**');
    for (const line of lines) {
      this.line(` * ${line}`);
    }
    this.line(' */');
    return this;
  }

  /**
   * Add a JSDoc comment with description and tags
   */
  jsdocWithTags(description?: string, tags?: Array<{ tag: string; value: string }>): this {
    if (!description && (!tags || tags.length === 0)) {
      return this;
    }

    this.line('/**');

    if (description) {
      for (const line of description.split('\n')) {
        this.line(` * ${line}`);
      }
    }

    if (tags && tags.length > 0) {
      if (description) {
        this.line(' *');
      }
      for (const { tag, value } of tags) {
        this.line(` * @${tag} ${value}`);
      }
    }

    this.line(' */');
    return this;
  }

  /**
   * Add a blank line
   */
  blank(): this {
    return this.line();
  }

  /**
   * Get the current indentation string
   */
  private getIndent(): string {
    return this.indentStr.repeat(this.currentIndent);
  }

  /**
   * Convert to string
   */
  toString(): string {
    return this._lines.join('\n');
  }

  /**
   * Clear the printer
   */
  clear(): this {
    this._lines = [];
    this.currentIndent = 0;
    return this;
  }
}

/**
 * Create a new code printer
 */
export function createPrinter(options?: IndentOptions): CodePrinter {
  return new CodePrinter(options);
}

/**
 * Utility function to wrap a type in parentheses if it contains special characters
 */
export function wrapType(type: string): string {
  if (type.includes('|') || type.includes('&')) {
    return `(${type})`;
  }
  return type;
}

/**
 * Join types with a separator
 */
export function joinTypes(types: string[], separator: ' | ' | ' & '): string {
  if (types.length === 0) return 'never';
  if (types.length === 1) return types[0]!;
  return types.join(separator);
}
