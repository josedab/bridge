/**
 * Multi-file TypeScript generator
 * Splits types into individual files for better tree-shaking
 */

import type { IRSchema, IRType, IRTypeRef, IRTypeKind } from '../../ir/types.js';
import { BaseGenerator, type GeneratorOptions, type GeneratedFile } from '../base.js';
import { createPrinter, type CodePrinter } from '../../codegen/printer.js';
import { formatCode } from '../../codegen/formatter.js';
import { logger } from '../../utils/logger.js';
import { join } from 'node:path';

export interface MultiFileTypeScriptOptions extends GeneratorOptions {
  /** Generate const enums */
  enumsAsConst?: boolean;
  /** Generate type guards */
  generateTypeGuards?: boolean;
}

/**
 * Multi-file TypeScript types generator
 */
export class MultiFileTypeScriptGenerator extends BaseGenerator {
  declare protected options: MultiFileTypeScriptOptions;

  constructor(schema: IRSchema, options: MultiFileTypeScriptOptions) {
    super(schema, options);
  }

  get name(): string {
    return 'TypeScript types (multi-file)';
  }

  get filename(): string {
    return 'types/index.ts';
  }

  async run(): Promise<GeneratedFile[]> {
    logger.step(`Generating ${this.name}...`);

    // Generate individual type files
    const typeNames: string[] = [];

    for (const [name, type] of this.schema.types) {
      const fileName = this.typeNameToFileName(name);
      typeNames.push(fileName);

      const printer = this.generateTypeFile(name, type);
      await this.addFileFromPrinter(`types/${fileName}.ts`, printer);
      logger.debug(`Generated types/${fileName}.ts`);
    }

    // Generate barrel export
    const barrelContent = await formatCode(
      this.generateBarrelExport(typeNames),
      this.options.format
    );
    this.files.push({
      path: join(this.options.outputDir, 'types/index.ts'),
      content: barrelContent,
    });

    // Generate type guards if enabled
    if (this.options.generateTypeGuards) {
      await this.generateTypeGuards();
    }

    logger.success(`Generated ${this.files.length} type files`);
    return this.files;
  }

  generate(): void {
    // Not used for multi-file generation
  }

  /**
   * Generate a single type file
   */
  private generateTypeFile(name: string, type: IRType): CodePrinter {
    const printer = createPrinter();

    this.addHeaderToPrinter(printer);

    // Collect dependencies
    const deps = this.collectDependencies(type);
    if (deps.size > 0) {
      for (const dep of deps) {
        if (dep !== name) {
          const depFileName = this.typeNameToFileName(dep);
          printer.importType(dep, `./${depFileName}.js`);
        }
      }
      printer.blank();
    }

    // Generate the type
    this.emitType(printer, name, type);

    return printer;
  }

  /**
   * Emit a type definition
   */
  private emitType(printer: CodePrinter, name: string, type: IRType): void {
    // Add JSDoc if available
    if (type.description) {
      printer.jsdoc([type.description]);
    }

    if (type.kind === 'object') {
      printer.interface(name, () => {
        if (type.properties) {
          for (const prop of type.properties) {
            const optional = prop.required ? '' : '?';
            const propType = this.typeRefToTs(prop.type);

            if (prop.description) {
              printer.jsdoc([prop.description]);
            }
            printer.line(`${this.formatPropertyName(prop.name)}${optional}: ${propType};`);
          }
        }
      });
    } else if (type.kind === 'enum' && type.enumValues) {
      if (this.options.enumsAsConst) {
        printer.line(`export const ${name} = {`);
        printer.indent();
        for (const enumVal of type.enumValues) {
          printer.line(`${String(enumVal.name).toUpperCase()}: ${JSON.stringify(enumVal.value)},`);
        }
        printer.dedent();
        printer.line('} as const;');
        printer.blank();
        printer.typeAlias(name, `typeof ${name}[keyof typeof ${name}]`);
      } else {
        printer.line(`export enum ${name} {`);
        printer.indent();
        for (const enumVal of type.enumValues) {
          printer.line(`${String(enumVal.name).toUpperCase()} = ${JSON.stringify(enumVal.value)},`);
        }
        printer.dedent();
        printer.line('}');
      }
    } else if (type.kind === 'union' && type.variants) {
      const variants = type.variants.map((v) => this.typeRefToTs(v));
      printer.typeAlias(name, variants.join(' | '));
    } else if (type.kind === 'array' && type.items) {
      printer.typeAlias(name, `${this.typeRefToTs(type.items)}[]`);
    } else if (this.isPrimitive(type.kind)) {
      printer.typeAlias(name, this.kindToTs(type.kind));
    }
  }

  /**
   * Check if a kind is a primitive type
   */
  private isPrimitive(kind: IRTypeKind): boolean {
    return ['string', 'number', 'integer', 'boolean', 'null', 'any', 'unknown', 'void'].includes(
      kind
    );
  }

  /**
   * Convert IR type kind to TypeScript
   */
  private kindToTs(kind: IRTypeKind): string {
    switch (kind) {
      case 'string':
      case 'date':
      case 'datetime':
        return 'string';
      case 'integer':
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'null':
        return 'null';
      case 'any':
        return 'any';
      case 'unknown':
        return 'unknown';
      case 'void':
        return 'void';
      case 'binary':
      case 'file':
        return 'Blob';
      default:
        return 'unknown';
    }
  }

  /**
   * Collect type dependencies
   */
  private collectDependencies(type: IRType): Set<string> {
    const deps = new Set<string>();
    this.collectFromType(type, deps);
    return deps;
  }

  private collectFromType(type: IRType, deps: Set<string>): void {
    if (type.properties) {
      for (const prop of type.properties) {
        this.collectFromTypeRef(prop.type, deps);
      }
    }

    if (type.variants) {
      for (const variant of type.variants) {
        this.collectFromTypeRef(variant, deps);
      }
    }

    if (type.items) {
      this.collectFromTypeRef(type.items, deps);
    }

    if (type.members) {
      for (const member of type.members) {
        this.collectFromTypeRef(member, deps);
      }
    }
  }

  private collectFromTypeRef(ref: IRTypeRef, deps: Set<string>): void {
    if (ref.kind === 'reference' && ref.name) {
      deps.add(ref.name);
    }
    if (ref.inlineType) {
      this.collectFromType(ref.inlineType, deps);
    }
  }

  /**
   * Convert type reference to TypeScript
   */
  private typeRefToTs(ref: IRTypeRef): string {
    if (ref.kind === 'reference' && ref.name) {
      return ref.nullable ? `${ref.name} | null` : ref.name;
    }
    if (ref.kind === 'primitive' && ref.primitiveKind) {
      const tsType = this.kindToTs(ref.primitiveKind);
      return ref.nullable ? `${tsType} | null` : tsType;
    }
    if (ref.kind === 'inline' && ref.inlineType) {
      return this.inlineTypeToTs(ref.inlineType);
    }
    return 'unknown';
  }

  private inlineTypeToTs(type: IRType): string {
    if (this.isPrimitive(type.kind)) {
      return this.kindToTs(type.kind);
    }
    if (type.kind === 'array' && type.items) {
      return `${this.typeRefToTs(type.items)}[]`;
    }
    if (type.kind === 'union' && type.variants) {
      return type.variants.map((v) => this.typeRefToTs(v)).join(' | ');
    }
    return 'unknown';
  }

  /**
   * Convert type name to file name (kebab-case)
   */
  private typeNameToFileName(name: string): string {
    // Convert PascalCase to kebab-case
    return name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * Format property name (quote if needed)
   */
  private formatPropertyName(name: string): string {
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
      return name;
    }
    return `'${name}'`;
  }

  /**
   * Add header to a printer
   */
  private addHeaderToPrinter(printer: CodePrinter): void {
    printer.comment('This file was auto-generated by Bridge');
    printer.comment('Do not edit this file directly');
    printer.blank();
  }

  /**
   * Generate type guard files
   */
  private async generateTypeGuards(): Promise<void> {
    const guardNames: string[] = [];

    for (const [name, type] of this.schema.types) {
      if (type.kind === 'object' || type.kind === 'enum') {
        const fileName = this.typeNameToFileName(name);
        guardNames.push(fileName);

        const printer = createPrinter();
        this.addHeaderToPrinter(printer);
        printer.importType(name, `../types/${fileName}.js`);
        printer.blank();

        this.emitGuard(printer, name, type);

        await this.addFileFromPrinter(`guards/${fileName}.ts`, printer);
      }
    }

    // Generate guards barrel
    if (guardNames.length > 0) {
      const barrelContent = await formatCode(
        this.generateBarrelExport(guardNames),
        this.options.format
      );
      this.files.push({
        path: join(this.options.outputDir, 'guards/index.ts'),
        content: barrelContent,
      });
    }
  }

  /**
   * Emit a type guard
   */
  private emitGuard(printer: CodePrinter, name: string, type: IRType): void {
    printer.jsdoc([`Type guard for ${name}`]);
    printer.func(`is${name}`, 'value: unknown', `value is ${name}`, () => {
      if (type.kind === 'object') {
        printer.line("if (typeof value !== 'object' || value === null) {");
        printer.indent();
        printer.line('return false;');
        printer.dedent();
        printer.line('}');

        if (type.properties) {
          for (const prop of type.properties) {
            if (prop.required) {
              printer.line(`if (!('${prop.name}' in value)) {`);
              printer.indent();
              printer.line('return false;');
              printer.dedent();
              printer.line('}');
            }
          }
        }

        printer.line('return true;');
      } else if (type.kind === 'enum' && type.enumValues) {
        const values = type.enumValues.map((v) => JSON.stringify(v.value)).join(', ');
        const firstValue = type.enumValues[0];
        const valueType = firstValue ? typeof firstValue.value : 'string';
        printer.line(`return [${values}].includes(value as ${valueType});`);
      }
    });
  }
}

/**
 * Create a multi-file TypeScript generator
 */
export function createMultiFileTypeScriptGenerator(
  schema: IRSchema,
  options: MultiFileTypeScriptOptions
): MultiFileTypeScriptGenerator {
  return new MultiFileTypeScriptGenerator(schema, options);
}
