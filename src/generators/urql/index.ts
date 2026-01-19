/**
 * urql hooks generator
 * Generates typed hooks for GraphQL operations using urql
 */

import type { IRSchema, IROperation } from '../../ir/types.js';
import { BaseGenerator, type GeneratorOptions } from '../base.js';
import { pascalCase } from '../../utils/naming.js';
import { logger } from '../../utils/logger.js';

export interface UrqlGeneratorOptions extends GeneratorOptions {
  /** Include document strings in output */
  includeDocuments?: boolean;
}

/**
 * urql hooks generator
 */
export class UrqlGenerator extends BaseGenerator {
  declare protected options: UrqlGeneratorOptions;

  constructor(schema: IRSchema, options: UrqlGeneratorOptions) {
    super(schema, options);
  }

  get name(): string {
    return 'urql hooks';
  }

  get filename(): string {
    return 'urql-hooks.ts';
  }

  generate(): void {
    if (this.schema.operations.length === 0) {
      logger.warn('No GraphQL operations found in schema');
      this.printer.comment('No GraphQL operations defined');
      return;
    }

    this.addHeader();
    this.generateImports();
    this.printer.blank();

    // Generate document constants if requested
    if (this.options.includeDocuments) {
      this.generateDocuments();
      this.printer.blank();
    }

    // Generate hooks for each operation
    for (const operation of this.schema.operations) {
      this.generateOperationHook(operation);
      this.printer.blank();
    }
  }

  /**
   * Generate import statements
   */
  private generateImports(): void {
    this.printer.line("import { gql } from '@urql/core';");

    const urqlImports: string[] = [];
    const urqlTypeImports: string[] = [];

    // Check what types of operations we have
    const hasQueries = this.schema.operations.some((op) => op.kind === 'query');
    const hasMutations = this.schema.operations.some((op) => op.kind === 'mutation');
    const hasSubscriptions = this.schema.operations.some((op) => op.kind === 'subscription');

    if (hasQueries) {
      urqlImports.push('useQuery');
      urqlTypeImports.push('UseQueryArgs', 'UseQueryResponse');
    }

    if (hasMutations) {
      urqlImports.push('useMutation');
      urqlTypeImports.push('UseMutationResponse');
    }

    if (hasSubscriptions) {
      urqlImports.push('useSubscription');
      urqlTypeImports.push('UseSubscriptionArgs', 'UseSubscriptionResponse');
    }

    if (urqlImports.length > 0) {
      this.printer.import(urqlImports, 'urql');
    }

    if (urqlTypeImports.length > 0) {
      this.printer.importType(urqlTypeImports, 'urql');
    }

    this.printer.blank();

    // Import types
    const typeImports: string[] = [];
    for (const operation of this.schema.operations) {
      typeImports.push(`${pascalCase(operation.name)}Variables`);
      typeImports.push(`${pascalCase(operation.name)}Result`);
    }

    if (typeImports.length > 0) {
      this.printer.importType(typeImports, './types.js');
    }
  }

  /**
   * Generate GraphQL document constants
   */
  private generateDocuments(): void {
    this.printer.comment('=== GraphQL Documents ===');
    this.printer.blank();

    for (const operation of this.schema.operations) {
      if (operation.document) {
        const docName = `${pascalCase(operation.name)}Document`;
        this.printer.jsdoc([`GraphQL document for ${operation.name}`]);
        this.printer.line(`export const ${docName} = gql\``);
        this.printer.indent();
        // Print the document with proper indentation
        const lines = operation.document.split('\n');
        for (const line of lines) {
          this.printer.line(line.trim());
        }
        this.printer.dedent();
        this.printer.line('`;');
        this.printer.blank();
      }
    }
  }

  /**
   * Generate hook for a GraphQL operation
   */
  private generateOperationHook(operation: IROperation): void {
    switch (operation.kind) {
      case 'query':
        this.generateQueryHook(operation);
        break;
      case 'mutation':
        this.generateMutationHook(operation);
        break;
      case 'subscription':
        this.generateSubscriptionHook(operation);
        break;
    }
  }

  /**
   * Generate a query hook
   */
  private generateQueryHook(operation: IROperation): void {
    const hookName = `use${pascalCase(operation.name)}`;
    const variablesType = `${pascalCase(operation.name)}Variables`;
    const resultType = `${pascalCase(operation.name)}Result`;
    const docName = this.options.includeDocuments
      ? `${pascalCase(operation.name)}Document`
      : 'document';

    if (operation.description) {
      this.printer.jsdoc([operation.description]);
    } else {
      this.printer.jsdoc([`Query hook for ${operation.name}`]);
    }

    const hasVariables = operation.variables.length > 0;
    const varsParam = hasVariables ? `variables: ${variablesType}` : '';
    const optionsType = `Omit<UseQueryArgs<${variablesType}, ${resultType}>, 'query'${hasVariables ? " | 'variables'" : ''}>`;

    if (hasVariables) {
      this.printer.func(
        hookName,
        `${varsParam}, options?: ${optionsType}`,
        `UseQueryResponse<${resultType}, ${variablesType}>`,
        () => {
          if (!this.options.includeDocuments) {
            this.printer.comment('TODO: Add your GraphQL document here');
            this.printer.line('const document = gql``;');
          }
          this.printer.line(`return useQuery<${resultType}, ${variablesType}>({`);
          this.printer.indent();
          this.printer.line(`query: ${docName},`);
          this.printer.line('variables,');
          this.printer.line('...options,');
          this.printer.dedent();
          this.printer.line('});');
        }
      );
    } else {
      this.printer.func(
        hookName,
        `options?: ${optionsType}`,
        `UseQueryResponse<${resultType}, ${variablesType}>`,
        () => {
          if (!this.options.includeDocuments) {
            this.printer.comment('TODO: Add your GraphQL document here');
            this.printer.line('const document = gql``;');
          }
          this.printer.line(`return useQuery<${resultType}, ${variablesType}>({`);
          this.printer.indent();
          this.printer.line(`query: ${docName},`);
          this.printer.line('...options,');
          this.printer.dedent();
          this.printer.line('});');
        }
      );
    }
  }

  /**
   * Generate a mutation hook
   */
  private generateMutationHook(operation: IROperation): void {
    const hookName = `use${pascalCase(operation.name)}`;
    const variablesType = `${pascalCase(operation.name)}Variables`;
    const resultType = `${pascalCase(operation.name)}Result`;
    const docName = this.options.includeDocuments
      ? `${pascalCase(operation.name)}Document`
      : 'document';

    if (operation.description) {
      this.printer.jsdoc([operation.description]);
    } else {
      this.printer.jsdoc([`Mutation hook for ${operation.name}`]);
    }

    this.printer.func(hookName, '', `UseMutationResponse<${resultType}, ${variablesType}>`, () => {
      if (!this.options.includeDocuments) {
        this.printer.comment('TODO: Add your GraphQL document here');
        this.printer.line('const document = gql``;');
      }
      this.printer.line(`return useMutation<${resultType}, ${variablesType}>(${docName});`);
    });
  }

  /**
   * Generate a subscription hook
   */
  private generateSubscriptionHook(operation: IROperation): void {
    const hookName = `use${pascalCase(operation.name)}`;
    const variablesType = `${pascalCase(operation.name)}Variables`;
    const resultType = `${pascalCase(operation.name)}Result`;
    const docName = this.options.includeDocuments
      ? `${pascalCase(operation.name)}Document`
      : 'document';

    if (operation.description) {
      this.printer.jsdoc([operation.description]);
    } else {
      this.printer.jsdoc([`Subscription hook for ${operation.name}`]);
    }

    const hasVariables = operation.variables.length > 0;
    const varsParam = hasVariables ? `variables: ${variablesType}` : '';
    const optionsType = `Omit<UseSubscriptionArgs<${variablesType}, ${resultType}>, 'query'${hasVariables ? " | 'variables'" : ''}>`;

    if (hasVariables) {
      this.printer.func(
        hookName,
        `${varsParam}, options?: ${optionsType}`,
        `UseSubscriptionResponse<${resultType}, ${variablesType}>`,
        () => {
          if (!this.options.includeDocuments) {
            this.printer.comment('TODO: Add your GraphQL document here');
            this.printer.line('const document = gql``;');
          }
          this.printer.line(`return useSubscription<${resultType}, ${variablesType}>({`);
          this.printer.indent();
          this.printer.line(`query: ${docName},`);
          this.printer.line('variables,');
          this.printer.line('...options,');
          this.printer.dedent();
          this.printer.line('});');
        }
      );
    } else {
      this.printer.func(
        hookName,
        `options?: ${optionsType}`,
        `UseSubscriptionResponse<${resultType}, ${variablesType}>`,
        () => {
          if (!this.options.includeDocuments) {
            this.printer.comment('TODO: Add your GraphQL document here');
            this.printer.line('const document = gql``;');
          }
          this.printer.line(`return useSubscription<${resultType}, ${variablesType}>({`);
          this.printer.indent();
          this.printer.line(`query: ${docName},`);
          this.printer.line('...options,');
          this.printer.dedent();
          this.printer.line('});');
        }
      );
    }
  }
}

/**
 * Create a new urql generator
 */
export function createUrqlGenerator(
  schema: IRSchema,
  options: UrqlGeneratorOptions
): UrqlGenerator {
  return new UrqlGenerator(schema, options);
}
