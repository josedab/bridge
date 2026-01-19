/**
 * TypeScript code generation utilities
 */

import type { IRType, IRTypeRef, IRTypeKind, IRProperty, IREnumValue } from '../../ir/types.js';
import { wrapType, joinTypes } from '../../codegen/printer.js';
import { escapeString } from '../../utils/naming.js';

/**
 * Convert an IR type kind to a TypeScript type string
 */
export function kindToTsType(kind: IRTypeKind): string {
  switch (kind) {
    case 'string':
    case 'date':
    case 'datetime':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'void':
      return 'void';
    case 'any':
      return 'any';
    case 'unknown':
      return 'unknown';
    case 'binary':
    case 'file':
      return 'Blob';
    default:
      return 'unknown';
  }
}

/**
 * Convert an IR type reference to a TypeScript type string
 */
export function typeRefToTs(ref: IRTypeRef, types: Map<string, IRType>): string {
  let baseType: string;

  switch (ref.kind) {
    case 'reference':
      baseType = ref.name ?? 'unknown';
      break;

    case 'primitive':
      baseType = kindToTsType(ref.primitiveKind ?? 'unknown');
      break;

    case 'inline':
      if (ref.inlineType) {
        baseType = typeToTs(ref.inlineType, types);
      } else {
        baseType = 'unknown';
      }
      break;

    default:
      baseType = 'unknown';
  }

  if (ref.nullable) {
    return `${wrapType(baseType)} | null`;
  }

  return baseType;
}

/**
 * Convert an IR type to a TypeScript type string
 */
export function typeToTs(type: IRType, types: Map<string, IRType>): string {
  switch (type.kind) {
    case 'object':
      return objectToTs(type, types);

    case 'array':
      if (type.items) {
        const itemType = typeRefToTs(type.items, types);
        return `${wrapType(itemType)}[]`;
      }
      return 'unknown[]';

    case 'union':
      if (type.variants && type.variants.length > 0) {
        const variantTypes = type.variants.map((v) => typeRefToTs(v, types));
        return joinTypes(variantTypes, ' | ');
      }
      return 'never';

    case 'intersection':
      if (type.members && type.members.length > 0) {
        const memberTypes = type.members.map((m) => typeRefToTs(m, types));
        return joinTypes(memberTypes, ' & ');
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
 * Convert an object type to a TypeScript inline type
 */
function objectToTs(type: IRType, types: Map<string, IRType>): string {
  if (!type.properties || type.properties.length === 0) {
    if (type.additionalProperties) {
      if (typeof type.additionalProperties === 'boolean') {
        return type.additionalProperties ? 'Record<string, unknown>' : '{}';
      }
      const valueType = typeRefToTs(type.additionalProperties, types);
      return `Record<string, ${valueType}>`;
    }
    return '{}';
  }

  const props = type.properties.map((prop) => {
    const optional = prop.required ? '' : '?';
    const readonly = prop.readonly ? 'readonly ' : '';
    const propType = typeRefToTs(prop.type, types);
    return `${readonly}${formatPropertyName(prop.name)}${optional}: ${propType}`;
  });

  return `{ ${props.join('; ')} }`;
}

/**
 * Format a property name, quoting if necessary
 */
export function formatPropertyName(name: string): string {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
    return name;
  }
  return `'${escapeString(name)}'`;
}

/**
 * Generate interface property line
 */
export function generatePropertyLine(prop: IRProperty, types: Map<string, IRType>): string {
  const optional = prop.required ? '' : '?';
  const readonly = prop.readonly ? 'readonly ' : '';
  const propType = typeRefToTs(prop.type, types);
  return `${readonly}${formatPropertyName(prop.name)}${optional}: ${propType};`;
}

/**
 * Generate enum member line
 */
export function generateEnumMemberLine(value: IREnumValue): string {
  if (typeof value.value === 'string') {
    return `${value.name} = '${escapeString(value.value)}',`;
  }
  return `${value.name} = ${value.value},`;
}

/**
 * Check if a type should be generated as an interface
 */
export function shouldUseInterface(type: IRType): boolean {
  return type.kind === 'object' && !type.additionalProperties;
}

/**
 * Check if a type should be generated as an enum
 */
export function shouldUseEnum(type: IRType): boolean {
  return type.kind === 'enum' && type.enumValues !== undefined;
}

/**
 * Generate a type guard function name
 */
export function getTypeGuardName(typeName: string): string {
  return `is${typeName}`;
}
