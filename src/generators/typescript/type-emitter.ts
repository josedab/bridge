/**
 * TypeScript type emitter - generates TypeScript interfaces and types from IR
 */

import type { IRType, IRProperty, IREnumValue } from '../../ir/types.js';
import type { CodePrinter } from '../../codegen/printer.js';
import {
  typeRefToTs,
  formatPropertyName,
  shouldUseInterface,
  shouldUseEnum,
  kindToTsType,
} from './utils.js';
import { escapeString } from '../../utils/naming.js';

/**
 * Type emitter class for generating TypeScript types
 */
export class TypeEmitter {
  constructor(
    private printer: CodePrinter,
    private types: Map<string, IRType>
  ) {}

  /**
   * Emit all types from the map
   */
  emitAll(): void {
    for (const [name, type] of this.types) {
      this.emit(name, type);
      this.printer.blank();
    }
  }

  /**
   * Emit a single type
   */
  emit(name: string, type: IRType): void {
    // Add JSDoc if there's a description
    if (type.description || type.deprecated) {
      this.emitJsDoc(type.description, type.deprecated);
    }

    if (shouldUseEnum(type)) {
      this.emitEnum(name, type);
    } else if (shouldUseInterface(type)) {
      this.emitInterface(name, type);
    } else {
      this.emitTypeAlias(name, type);
    }
  }

  /**
   * Emit a JSDoc comment
   */
  private emitJsDoc(description?: string, deprecated?: boolean): void {
    const tags: Array<{ tag: string; value: string }> = [];

    if (deprecated) {
      tags.push({ tag: 'deprecated', value: '' });
    }

    this.printer.jsdocWithTags(description, tags.length > 0 ? tags : undefined);
  }

  /**
   * Emit an interface declaration
   */
  private emitInterface(name: string, type: IRType): void {
    this.printer.block(`export interface ${name}`, () => {
      if (type.properties) {
        for (const prop of type.properties) {
          this.emitProperty(prop);
        }
      }
    });
  }

  /**
   * Emit a property in an interface
   */
  private emitProperty(prop: IRProperty): void {
    // Add JSDoc for property
    if (prop.description || prop.deprecated) {
      this.emitJsDoc(prop.description, prop.deprecated);
    }

    const optional = prop.required ? '' : '?';
    const readonly = prop.readonly ? 'readonly ' : '';
    const propType = typeRefToTs(prop.type, this.types);
    const propName = formatPropertyName(prop.name);

    this.printer.line(`${readonly}${propName}${optional}: ${propType};`);
  }

  /**
   * Emit an enum declaration
   */
  private emitEnum(name: string, type: IRType): void {
    this.printer.block(`export enum ${name}`, () => {
      if (type.enumValues) {
        for (const value of type.enumValues) {
          this.emitEnumMember(value);
        }
      }
    });
  }

  /**
   * Emit an enum member
   */
  private emitEnumMember(value: IREnumValue): void {
    if (value.description || value.deprecated) {
      this.emitJsDoc(value.description, value.deprecated);
    }

    if (typeof value.value === 'string') {
      this.printer.line(`${value.name} = '${escapeString(value.value)}',`);
    } else {
      this.printer.line(`${value.name} = ${value.value},`);
    }
  }

  /**
   * Emit a type alias
   */
  private emitTypeAlias(name: string, type: IRType): void {
    const tsType = this.generateTypeExpression(type);
    this.printer.line(`export type ${name} = ${tsType};`);
  }

  /**
   * Generate a TypeScript type expression for a type
   */
  private generateTypeExpression(type: IRType): string {
    switch (type.kind) {
      case 'object':
        return this.generateObjectType(type);

      case 'array':
        if (type.items) {
          const itemType = typeRefToTs(type.items, this.types);
          // Wrap in parentheses if union/intersection
          const wrappedType =
            itemType.includes('|') || itemType.includes('&') ? `(${itemType})` : itemType;
          return `${wrappedType}[]`;
        }
        return 'unknown[]';

      case 'union':
        if (type.variants && type.variants.length > 0) {
          return type.variants.map((v) => typeRefToTs(v, this.types)).join(' | ');
        }
        return 'never';

      case 'intersection':
        if (type.members && type.members.length > 0) {
          return type.members.map((m) => typeRefToTs(m, this.types)).join(' & ');
        }
        return 'unknown';

      case 'enum':
        if (type.enumValues && type.enumValues.length > 0) {
          return type.enumValues
            .map((v) =>
              typeof v.value === 'string' ? `'${escapeString(v.value)}'` : String(v.value)
            )
            .join(' | ');
        }
        return 'never';

      case 'literal':
        if (type.literalValue !== undefined) {
          return typeof type.literalValue === 'string'
            ? `'${escapeString(type.literalValue)}'`
            : String(type.literalValue);
        }
        return 'never';

      default:
        return kindToTsType(type.kind);
    }
  }

  /**
   * Generate an inline object type
   */
  private generateObjectType(type: IRType): string {
    if (!type.properties || type.properties.length === 0) {
      if (type.additionalProperties) {
        if (typeof type.additionalProperties === 'boolean') {
          return type.additionalProperties ? 'Record<string, unknown>' : 'Record<string, never>';
        }
        const valueType = typeRefToTs(type.additionalProperties, this.types);
        return `Record<string, ${valueType}>`;
      }
      return 'Record<string, never>';
    }

    // For inline object types, generate a multi-line structure
    const lines: string[] = ['{'];

    for (const prop of type.properties) {
      const optional = prop.required ? '' : '?';
      const readonly = prop.readonly ? 'readonly ' : '';
      const propType = typeRefToTs(prop.type, this.types);
      const propName = formatPropertyName(prop.name);
      lines.push(`  ${readonly}${propName}${optional}: ${propType};`);
    }

    lines.push('}');
    return lines.join('\n');
  }
}
