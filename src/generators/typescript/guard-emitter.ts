/**
 * Type guard emitter - generates TypeScript type guards from IR types
 */

import type { IRType, IRTypeRef, IRDiscriminator } from '../../ir/types.js';
import type { CodePrinter } from '../../codegen/printer.js';

/**
 * Type guard emitter class for generating TypeScript type guards
 */
export class TypeGuardEmitter {
  constructor(
    private printer: CodePrinter,
    private types: Map<string, IRType>
  ) {}

  /**
   * Emit type guards for all types that need them
   */
  emitAll(): void {
    this.printer.comment('=== Type Guards ===');
    this.printer.blank();

    for (const [name, type] of this.types) {
      if (this.shouldGenerateGuard(type)) {
        this.emit(name, type);
        this.printer.blank();
      }
    }
  }

  /**
   * Check if we should generate a type guard for this type
   */
  private shouldGenerateGuard(type: IRType): boolean {
    // Generate guards for objects, unions (especially discriminated), and enums
    return type.kind === 'object' || type.kind === 'union' || type.kind === 'enum';
  }

  /**
   * Emit a type guard for a single type
   */
  emit(name: string, type: IRType): void {
    switch (type.kind) {
      case 'object':
        this.emitObjectGuard(name, type);
        break;
      case 'union':
        this.emitUnionGuard(name, type);
        break;
      case 'enum':
        this.emitEnumGuard(name, type);
        break;
    }
  }

  /**
   * Emit a type guard for an object type
   */
  private emitObjectGuard(name: string, type: IRType): void {
    const guardName = `is${name}`;

    this.printer.jsdocWithTags(`Type guard for ${name}`, [
      { tag: 'param', value: 'value - The value to check' },
    ]);

    this.printer.func(guardName, 'value: unknown', `value is ${name}`, () => {
      this.printer.line("if (typeof value !== 'object' || value === null) {");
      this.printer.indent();
      this.printer.line('return false;');
      this.printer.dedent();
      this.printer.line('}');
      this.printer.blank();

      this.printer.line('const obj = value as Record<string, unknown>;');

      // Check required properties
      if (type.properties && type.properties.length > 0) {
        const requiredProps = type.properties.filter((p) => p.required);
        if (requiredProps.length > 0) {
          this.printer.blank();
          this.printer.comment('Check required properties');
          for (const prop of requiredProps) {
            const propKey = this.formatPropertyKey(prop.name);
            const checkExpr = this.generatePropertyCheck(prop.name, prop.type);
            this.printer.line(`if (!(${propKey} in obj) || ${checkExpr}) {`);
            this.printer.indent();
            this.printer.line('return false;');
            this.printer.dedent();
            this.printer.line('}');
          }
        }

        // Check optional properties if present
        const optionalProps = type.properties.filter((p) => !p.required);
        if (optionalProps.length > 0) {
          this.printer.blank();
          this.printer.comment('Check optional properties if present');
          for (const prop of optionalProps) {
            const propKey = this.formatPropertyKey(prop.name);
            const checkExpr = this.generatePropertyCheck(prop.name, prop.type);
            this.printer.line(`if (${propKey} in obj && ${checkExpr}) {`);
            this.printer.indent();
            this.printer.line('return false;');
            this.printer.dedent();
            this.printer.line('}');
          }
        }
      }

      this.printer.blank();
      this.printer.line('return true;');
    });
  }

  /**
   * Emit a type guard for a union type
   */
  private emitUnionGuard(name: string, type: IRType): void {
    const guardName = `is${name}`;

    // If discriminated union, generate a more specific guard
    if (type.discriminator) {
      this.emitDiscriminatedUnionGuard(name, type, type.discriminator);
      return;
    }

    this.printer.jsdocWithTags(`Type guard for ${name}`, [
      { tag: 'param', value: 'value - The value to check' },
    ]);

    this.printer.func(guardName, 'value: unknown', `value is ${name}`, () => {
      if (!type.variants || type.variants.length === 0) {
        this.printer.line('return false;');
        return;
      }

      // Try each variant
      const variantChecks = type.variants.map((variant) =>
        this.generateTypeRefCheck('value', variant)
      );

      this.printer.line(`return ${variantChecks.join(' || ')};`);
    });
  }

  /**
   * Emit a type guard for a discriminated union
   */
  private emitDiscriminatedUnionGuard(
    name: string,
    _type: IRType,
    discriminator: IRDiscriminator
  ): void {
    const guardName = `is${name}`;
    const propName = discriminator.propertyName;

    this.printer.jsdocWithTags(`Type guard for ${name} (discriminated union)`, [
      { tag: 'param', value: 'value - The value to check' },
    ]);

    this.printer.func(guardName, 'value: unknown', `value is ${name}`, () => {
      this.printer.line("if (typeof value !== 'object' || value === null) {");
      this.printer.indent();
      this.printer.line('return false;');
      this.printer.dedent();
      this.printer.line('}');
      this.printer.blank();

      this.printer.line('const obj = value as Record<string, unknown>;');
      this.printer.blank();

      // Check discriminator property exists
      this.printer.line(`if (!('${propName}' in obj)) {`);
      this.printer.indent();
      this.printer.line('return false;');
      this.printer.dedent();
      this.printer.line('}');
      this.printer.blank();

      // If we have a mapping, check the discriminator value
      if (discriminator.mapping && discriminator.mapping.size > 0) {
        const validValues = Array.from(discriminator.mapping.keys())
          .map((v) => `'${v}'`)
          .join(', ');
        this.printer.line(`const validValues = [${validValues}];`);
        this.printer.line(`return validValues.includes(obj['${propName}'] as string);`);
      } else {
        // Without mapping, just check the property exists
        this.printer.line('return true;');
      }
    });

    // Generate individual variant guards if we have a mapping
    if (discriminator.mapping && discriminator.mapping.size > 0) {
      this.printer.blank();
      for (const [discriminatorValue, typeName] of discriminator.mapping) {
        this.emitVariantGuard(name, typeName, propName, discriminatorValue);
        this.printer.blank();
      }
    }
  }

  /**
   * Emit a type guard for a specific variant of a discriminated union
   */
  private emitVariantGuard(
    unionName: string,
    variantTypeName: string,
    propName: string,
    discriminatorValue: string
  ): void {
    const guardName = `is${variantTypeName}`;
    const variantType = this.types.get(variantTypeName);

    if (!variantType) {
      return;
    }

    this.printer.jsdocWithTags(`Type guard for ${variantTypeName} variant of ${unionName}`, [
      { tag: 'param', value: `value - A ${unionName} value to narrow` },
    ]);

    this.printer.func(guardName, `value: ${unionName}`, `value is ${variantTypeName}`, () => {
      this.printer.line(`return value.${propName} === '${discriminatorValue}';`);
    });
  }

  /**
   * Emit a type guard for an enum type
   */
  private emitEnumGuard(name: string, type: IRType): void {
    const guardName = `is${name}`;

    this.printer.jsdocWithTags(`Type guard for ${name} enum`, [
      { tag: 'param', value: 'value - The value to check' },
    ]);

    this.printer.func(guardName, 'value: unknown', `value is ${name}`, () => {
      if (!type.enumValues || type.enumValues.length === 0) {
        this.printer.line('return false;');
        return;
      }

      const firstValue = type.enumValues[0];
      const isStringEnum = typeof firstValue?.value === 'string';

      if (isStringEnum) {
        const values = type.enumValues!.map((v) => `'${v.value}'`).join(', ');
        this.printer.line(`const validValues = [${values}] as const;`);
        this.printer.line(
          "return typeof value === 'string' && validValues.includes(value as typeof validValues[number]);"
        );
      } else {
        const values = type.enumValues!.map((v) => String(v.value)).join(', ');
        this.printer.line(`const validValues = [${values}] as const;`);
        this.printer.line(
          "return typeof value === 'number' && validValues.includes(value as typeof validValues[number]);"
        );
      }
    });
  }

  /**
   * Format a property name as a string key for use in 'key in obj' checks
   */
  private formatPropertyKey(name: string): string {
    return `'${name}'`;
  }

  /**
   * Generate accessor for a property on obj
   */
  private formatPropertyAccessor(name: string): string {
    // Use bracket notation with string literal for safety
    return `obj['${name}']`;
  }

  /**
   * Generate a check expression for a property
   */
  private generatePropertyCheck(propName: string, typeRef: IRTypeRef): string {
    const accessor = this.formatPropertyAccessor(propName);
    return `!(${this.generateTypeRefCheckExpr(accessor, typeRef)})`;
  }

  /**
   * Generate a type check expression for a type reference
   */
  private generateTypeRefCheck(varName: string, typeRef: IRTypeRef): string {
    return this.generateTypeRefCheckExpr(varName, typeRef);
  }

  /**
   * Generate a check expression for a type reference
   */
  private generateTypeRefCheckExpr(accessor: string, typeRef: IRTypeRef): string {
    let baseCheck: string;

    switch (typeRef.kind) {
      case 'primitive':
        baseCheck = this.generatePrimitiveCheck(accessor, typeRef.primitiveKind!);
        break;
      case 'reference':
        // For referenced types, call their type guard if it exists
        baseCheck = `is${typeRef.name}(${accessor})`;
        break;
      case 'inline':
        if (typeRef.inlineType) {
          baseCheck = this.generateInlineTypeCheck(accessor, typeRef.inlineType);
        } else {
          baseCheck = 'true';
        }
        break;
      default:
        baseCheck = 'true';
    }

    if (typeRef.nullable) {
      return `(${accessor} === null || ${baseCheck})`;
    }

    return baseCheck;
  }

  /**
   * Generate a check for a primitive type
   */
  private generatePrimitiveCheck(accessor: string, kind: string): string {
    switch (kind) {
      case 'string':
      case 'date':
      case 'datetime':
        return `typeof ${accessor} === 'string'`;
      case 'number':
      case 'integer':
        return `typeof ${accessor} === 'number'`;
      case 'boolean':
        return `typeof ${accessor} === 'boolean'`;
      case 'null':
        return `${accessor} === null`;
      case 'any':
      case 'unknown':
        return 'true';
      case 'void':
        return `${accessor} === undefined`;
      default:
        return 'true';
    }
  }

  /**
   * Generate a check for an inline type
   */
  private generateInlineTypeCheck(accessor: string, type: IRType): string {
    switch (type.kind) {
      case 'object':
        return `typeof ${accessor} === 'object' && ${accessor} !== null`;
      case 'array':
        return `Array.isArray(${accessor})`;
      case 'string':
      case 'date':
      case 'datetime':
        return `typeof ${accessor} === 'string'`;
      case 'number':
      case 'integer':
        return `typeof ${accessor} === 'number'`;
      case 'boolean':
        return `typeof ${accessor} === 'boolean'`;
      case 'enum':
        if (type.enumValues && type.enumValues.length > 0) {
          const values = type.enumValues
            .map((v) => (typeof v.value === 'string' ? `'${v.value}'` : String(v.value)))
            .join(', ');
          return `[${values}].includes(${accessor} as never)`;
        }
        return 'false';
      case 'literal':
        if (type.literalValue !== undefined) {
          return typeof type.literalValue === 'string'
            ? `${accessor} === '${type.literalValue}'`
            : `${accessor} === ${type.literalValue}`;
        }
        return 'false';
      default:
        return 'true';
    }
  }
}
