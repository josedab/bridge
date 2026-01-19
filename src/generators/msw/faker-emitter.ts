/**
 * Faker emitter - generates mock data factory functions
 */

import type { IRType, IRTypeRef, IRProperty } from '../../ir/types.js';
import type { CodePrinter } from '../../codegen/printer.js';

/**
 * Faker emitter for generating mock data factories
 */
export class FakerEmitter {
  constructor(
    private printer: CodePrinter,
    private types: Map<string, IRType>
  ) {}

  /**
   * Emit mock factory functions for all types
   */
  emitAll(): void {
    this.printer.comment('=== Mock Data Factories ===');
    this.printer.blank();

    // Emit utility function for random selection
    this.emitHelpers();

    for (const [name, type] of this.types) {
      if (this.shouldGenerateFactory(type)) {
        this.emit(name, type);
        this.printer.blank();
      }
    }
  }

  /**
   * Emit helper utilities
   */
  private emitHelpers(): void {
    // Random ID generator
    this.printer.func('generateId', '', 'string', () => {
      this.printer.line(
        'return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);'
      );
    });
    this.printer.blank();

    // Random array element selector (generic function)
    this.printer.line('export function randomElement<T>(arr: readonly T[]): T {');
    this.printer.indent();
    this.printer.line('return arr[Math.floor(Math.random() * arr.length)]!;');
    this.printer.dedent();
    this.printer.line('}');
    this.printer.blank();

    // Random integer generator
    this.printer.func('randomInt', 'min: number, max: number', 'number', () => {
      this.printer.line('return Math.floor(Math.random() * (max - min + 1)) + min;');
    });
    this.printer.blank();

    // Random boolean
    this.printer.func('randomBoolean', '', 'boolean', () => {
      this.printer.line('return Math.random() > 0.5;');
    });
    this.printer.blank();

    // Random date
    this.printer.func('randomDate', 'start?: Date, end?: Date', 'string', () => {
      this.printer.line('const s = start ?? new Date(2020, 0, 1);');
      this.printer.line('const e = end ?? new Date();');
      this.printer.line(
        'return new Date(s.getTime() + Math.random() * (e.getTime() - s.getTime())).toISOString();'
      );
    });
    this.printer.blank();

    // Sample words for text generation
    this.printer.const(
      'SAMPLE_WORDS',
      "['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor']"
    );
    this.printer.blank();

    // Random word
    this.printer.func('randomWord', '', 'string', () => {
      this.printer.line('return randomElement(SAMPLE_WORDS);');
    });
    this.printer.blank();

    // Random sentence
    this.printer.func('randomSentence', 'wordCount?: number', 'string', () => {
      this.printer.line('const count = wordCount ?? randomInt(3, 8);');
      this.printer.line("return Array.from({ length: count }, () => randomWord()).join(' ');");
    });
    this.printer.blank();

    // Random email
    this.printer.func('randomEmail', '', 'string', () => {
      this.printer.line('return `${randomWord()}${randomInt(1, 999)}@example.com`;');
    });
    this.printer.blank();

    // Random URL
    this.printer.func('randomUrl', '', 'string', () => {
      this.printer.line('return `https://example.com/${randomWord()}/${generateId()}`;');
    });
    this.printer.blank();
  }

  /**
   * Check if we should generate a factory for this type
   */
  private shouldGenerateFactory(type: IRType): boolean {
    return type.kind === 'object';
  }

  /**
   * Emit a mock factory function for a type
   */
  emit(name: string, type: IRType): void {
    const factoryName = `mock${name}`;
    const partialType = `Partial<${name}>`;

    this.printer.jsdocWithTags(`Create mock ${name} data`, [
      { tag: 'param', value: 'overrides - Optional property overrides' },
    ]);

    this.printer.func(factoryName, `overrides: ${partialType} = {}`, name, () => {
      this.printer.line('return {');
      this.printer.indent();

      if (type.properties) {
        for (const prop of type.properties) {
          const mockValue = this.generateMockValue(prop.name, prop.type, prop);
          this.printer.line(`${prop.name}: ${mockValue},`);
        }
      }

      this.printer.line('...overrides,');
      this.printer.dedent();
      this.printer.line('};');
    });
  }

  /**
   * Generate a mock value for a type reference
   */
  private generateMockValue(propName: string, typeRef: IRTypeRef, prop?: IRProperty): string {
    // Check for nullable/optional
    const isOptional = prop && !prop.required;

    let baseValue: string;

    switch (typeRef.kind) {
      case 'primitive':
        baseValue = this.generatePrimitiveMock(propName, typeRef.primitiveKind!, typeRef);
        break;
      case 'reference':
        baseValue = this.generateReferenceMock(typeRef.name!);
        break;
      case 'inline':
        if (typeRef.inlineType) {
          baseValue = this.generateInlineMock(propName, typeRef.inlineType, typeRef);
        } else {
          baseValue = 'undefined';
        }
        break;
      default:
        baseValue = 'undefined';
    }

    // Handle nullable
    if (typeRef.nullable) {
      return `randomBoolean() ? ${baseValue} : null`;
    }

    // Handle optional - use the value or undefined
    if (isOptional) {
      return `overrides.${propName} !== undefined ? overrides.${propName} : ${baseValue}`;
    }

    return baseValue;
  }

  /**
   * Generate mock value for a primitive type
   */
  private generatePrimitiveMock(propName: string, kind: string, typeRef?: IRTypeRef): string {
    const lowerName = propName.toLowerCase();

    // Use property name heuristics for better mock data
    if (lowerName.includes('id')) return 'generateId()';
    if (lowerName.includes('email')) return 'randomEmail()';
    if (lowerName.includes('url') || lowerName.includes('uri')) return 'randomUrl()';
    if (lowerName.includes('name')) return 'randomWord()';
    if (lowerName.includes('description')) return 'randomSentence()';

    // Get format and constraints from inline type if available
    const inlineType = typeRef?.inlineType;
    const format = inlineType?.format;
    const minimum = inlineType?.minimum;
    const maximum = inlineType?.maximum;

    switch (kind) {
      case 'string':
        if (format === 'uuid') return 'generateId()';
        if (format === 'email') return 'randomEmail()';
        if (format === 'uri') return 'randomUrl()';
        return 'randomWord()';

      case 'number':
      case 'integer':
        const min = minimum ?? 0;
        const max = maximum ?? 100;
        return `randomInt(${min}, ${max})`;

      case 'boolean':
        return 'randomBoolean()';

      case 'date':
      case 'datetime':
        return 'randomDate()';

      case 'null':
        return 'null';

      default:
        return 'undefined';
    }
  }

  /**
   * Generate mock value for a referenced type
   */
  private generateReferenceMock(typeName: string): string {
    const refType = this.types.get(typeName);

    if (refType) {
      if (refType.kind === 'enum' && refType.enumValues && refType.enumValues.length > 0) {
        // For enums, return a random value
        const values = refType.enumValues.map((v) =>
          typeof v.value === 'string' ? `'${v.value}'` : String(v.value)
        );
        return `randomElement([${values.join(', ')}] as const)`;
      }

      if (refType.kind === 'object') {
        return `mock${typeName}()`;
      }
    }

    return `mock${typeName}()`;
  }

  /**
   * Generate mock value for an inline type
   */
  private generateInlineMock(propName: string, type: IRType, _typeRef?: IRTypeRef): string {
    switch (type.kind) {
      case 'array':
        if (type.items) {
          const itemMock = this.generateMockValue(`${propName}Item`, type.items);
          return `[${itemMock}, ${itemMock}]`;
        }
        return '[]';

      case 'enum':
        if (type.enumValues && type.enumValues.length > 0) {
          const values = type.enumValues.map((v) =>
            typeof v.value === 'string' ? `'${v.value}'` : String(v.value)
          );
          return `randomElement([${values.join(', ')}] as const)`;
        }
        return 'undefined';

      case 'object':
        if (type.additionalProperties) {
          return '{}';
        }
        if (type.properties) {
          const props = type.properties.map((p) => {
            const val = this.generateMockValue(p.name, p.type, p);
            return `${p.name}: ${val}`;
          });
          return `{ ${props.join(', ')} }`;
        }
        return '{}';

      case 'union':
        if (type.variants && type.variants.length > 0) {
          // Return mock for first variant
          return this.generateMockValue(propName, type.variants[0]!);
        }
        return 'undefined';

      default:
        return this.generatePrimitiveMock(propName, type.kind, _typeRef);
    }
  }
}
