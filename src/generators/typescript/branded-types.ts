/**
 * Branded/Nominal Types Generator
 * Generates type-safe ID types that prevent mixing up different identifiers
 */

import type { IRSchema, IRType, IRProperty } from '../../ir/types.js';
import { type CodePrinter, createPrinter } from '../../codegen/printer.js';
import { pascalCase } from '../../utils/naming.js';

export interface BrandedTypesOptions {
  /** Pattern to match ID fields (default: fields ending with 'Id' or named 'id') */
  idPattern?: RegExp;
  /** Custom brand symbol name */
  brandSymbol?: string;
}

const DEFAULT_ID_PATTERN = /^id$|Id$/;

/**
 * Branded types emitter
 */
export class BrandedTypesEmitter {
  private idPattern: RegExp;
  private brandSymbol: string;
  private brandedTypes: Map<string, string> = new Map(); // typeName -> brandName

  constructor(
    private printer: CodePrinter,
    private types: Map<string, IRType>,
    options: BrandedTypesOptions = {}
  ) {
    this.idPattern = options.idPattern ?? DEFAULT_ID_PATTERN;
    this.brandSymbol = options.brandSymbol ?? '__brand';
  }

  /**
   * Emit the brand utility types and all branded ID types
   */
  emitAll(): void {
    // First, collect all ID types that need branding
    this.collectBrandedTypes();

    if (this.brandedTypes.size === 0) {
      return;
    }

    // Emit the brand infrastructure
    this.emitBrandInfrastructure();
    this.printer.blank();

    // Emit each branded type
    this.printer.comment('=== Branded ID Types ===');
    this.printer.blank();

    for (const [typeName, brandName] of this.brandedTypes) {
      this.emitBrandedType(typeName, brandName);
    }

    // Emit helper functions
    this.printer.blank();
    this.emitHelperFunctions();
  }

  /**
   * Get the branded type name for a given property
   */
  getBrandedTypeName(typeName: string, propertyName: string): string | undefined {
    const brandName = this.makeBrandName(typeName, propertyName);
    return this.brandedTypes.has(brandName) ? brandName : undefined;
  }

  /**
   * Emit the brand symbol and Brand utility type
   */
  private emitBrandInfrastructure(): void {
    this.printer.comment('=== Brand Infrastructure ===');
    this.printer.blank();

    // Emit unique symbol declaration
    this.printer.jsdoc(['Unique symbol for type branding']);
    this.printer.line(`declare const ${this.brandSymbol}: unique symbol;`);
    this.printer.blank();

    // Emit Brand utility type
    this.printer.jsdoc([
      'Brand utility type for creating nominal/branded types',
      'Makes types structurally incompatible even if they have the same underlying type',
    ]);
    this.printer.line(
      `export type Brand<T, B extends string> = T & { readonly [${this.brandSymbol}]: B };`
    );
  }

  /**
   * Collect all properties that should be branded
   */
  private collectBrandedTypes(): void {
    for (const [typeName, type] of this.types) {
      if (type.kind !== 'object' || !type.properties) continue;

      for (const prop of type.properties) {
        if (this.shouldBrandProperty(prop)) {
          const brandName = this.makeBrandName(typeName, prop.name);
          this.brandedTypes.set(brandName, brandName);
        }
      }
    }
  }

  /**
   * Check if a property should be branded
   */
  private shouldBrandProperty(prop: IRProperty): boolean {
    // Only brand string or number types
    const propType = prop.type;
    if (propType.kind !== 'primitive') return false;

    const primitiveKind = propType.primitiveKind;
    if (primitiveKind !== 'string' && primitiveKind !== 'number' && primitiveKind !== 'integer') {
      return false;
    }

    // Check if the property name matches the ID pattern
    return this.idPattern.test(prop.name);
  }

  /**
   * Create a brand name from type and property names
   */
  private makeBrandName(typeName: string, propertyName: string): string {
    // For fields named "id", use the type name + Id
    // For fields like "userId", "petId", etc., use them directly
    if (propertyName.toLowerCase() === 'id') {
      return `${typeName}Id`;
    }
    return pascalCase(propertyName);
  }

  /**
   * Emit a single branded type
   */
  private emitBrandedType(typeName: string, brandName: string): void {
    // Determine the underlying type (default to string for IDs)
    const underlyingType = this.inferUnderlyingType(typeName);

    this.printer.jsdoc([
      `Branded type for ${brandName}`,
      `Ensures type safety when passing ID values`,
    ]);
    this.printer.typeAlias(brandName, `Brand<${underlyingType}, '${brandName}'>`);
    this.printer.blank();
  }

  /**
   * Infer the underlying type for a branded ID
   */
  private inferUnderlyingType(typeName: string): string {
    // Look through all types to find the actual type of this ID field
    for (const [, type] of this.types) {
      if (type.kind !== 'object' || !type.properties) continue;

      for (const prop of type.properties) {
        const brandName = this.makeBrandName(type.name, prop.name);
        if (brandName === typeName) {
          const primitiveKind = prop.type.primitiveKind;
          if (primitiveKind === 'integer' || primitiveKind === 'number') {
            return 'number';
          }
        }
      }
    }

    // Default to string for IDs
    return 'string';
  }

  /**
   * Emit helper functions for creating branded types
   */
  private emitHelperFunctions(): void {
    this.printer.comment('=== Branded Type Helpers ===');
    this.printer.blank();

    // Generic brand function
    this.printer.jsdoc([
      'Create a branded value from a raw value',
      'Use this to safely create branded IDs from API responses or user input',
    ]);
    this.printer.line('export function brand<T, B extends string>(value: T): Brand<T, B> {');
    this.printer.indent();
    this.printer.line('return value as Brand<T, B>;');
    this.printer.dedent();
    this.printer.line('}');
    this.printer.blank();

    // Generic unbrand function
    this.printer.jsdoc([
      'Extract the raw value from a branded type',
      'Use this when you need to pass the underlying value to an API that expects the raw type',
    ]);
    this.printer.line('export function unbrand<T, B extends string>(value: Brand<T, B>): T {');
    this.printer.indent();
    this.printer.line('return value as T;');
    this.printer.dedent();
    this.printer.line('}');
    this.printer.blank();

    // Generate specific creator functions for each branded type
    for (const [typeName] of this.brandedTypes) {
      const underlyingType = this.inferUnderlyingType(typeName);
      const creatorName = `create${typeName}`;

      this.printer.jsdoc([`Create a ${typeName} from a raw ${underlyingType}`]);
      this.printer.line(`export function ${creatorName}(value: ${underlyingType}): ${typeName} {`);
      this.printer.indent();
      this.printer.line(`return value as ${typeName};`);
      this.printer.dedent();
      this.printer.line('}');
      this.printer.blank();
    }
  }
}

/**
 * Generate branded types as a standalone file
 */
export function generateBrandedTypes(schema: IRSchema, options: BrandedTypesOptions = {}): string {
  const printer = createPrinter();

  printer.comment('This file was auto-generated by Bridge');
  printer.comment('Do not edit this file directly');
  printer.blank();

  const emitter = new BrandedTypesEmitter(printer, schema.types, options);
  emitter.emitAll();

  return printer.toString();
}
