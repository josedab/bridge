/**
 * Apollo Client hooks generator
 * Generates typed hooks for GraphQL operations using Apollo Client
 */

import type { IRSchema, IROperation } from '../../ir/types.js';
import { BaseGenerator, type GeneratorOptions } from '../base.js';
import { pascalCase } from '../../utils/naming.js';
import { logger } from '../../utils/logger.js';

export interface ApolloGeneratorOptions extends GeneratorOptions {
  /** Generate suspense-enabled hooks (Apollo Client 3.8+) */
  suspense?: boolean;
  /** Generate lazy query hooks */
  lazyQueries?: boolean;
  /** Include document strings in output */
  includeDocuments?: boolean;
}

/**
 * Apollo Client hooks generator
 */
export class ApolloGenerator extends BaseGenerator {
  declare protected options: ApolloGeneratorOptions;

  constructor(schema: IRSchema, options: ApolloGeneratorOptions) {
    super(schema, options);
  }

  get name(): string {
    return 'Apollo Client hooks';
  }

  get filename(): string {
    return 'apollo-hooks.ts';
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
    const apolloImports: string[] = ['gql'];
    const apolloTypeImports: string[] = [];

    // Check what types of operations we have
    const hasQueries = this.schema.operations.some((op) => op.kind === 'query');
    const hasMutations = this.schema.operations.some((op) => op.kind === 'mutation');
    const hasSubscriptions = this.schema.operations.some((op) => op.kind === 'subscription');

    if (hasQueries) {
      apolloImports.push('useQuery');
      apolloTypeImports.push('QueryHookOptions', 'QueryResult');

      if (this.options.lazyQueries) {
        apolloImports.push('useLazyQuery');
        apolloTypeImports.push('LazyQueryHookOptions', 'LazyQueryResultTuple');
      }

      if (this.options.suspense) {
        apolloImports.push('useSuspenseQuery');
        apolloTypeImports.push('SuspenseQueryHookOptions');
      }
    }

    if (hasMutations) {
      apolloImports.push('useMutation');
      apolloTypeImports.push('MutationHookOptions', 'MutationTuple');
    }

    if (hasSubscriptions) {
      apolloImports.push('useSubscription');
      apolloTypeImports.push('SubscriptionHookOptions', 'SubscriptionResult');
    }

    this.printer.import(apolloImports, '@apollo/client');
    if (apolloTypeImports.length > 0) {
      this.printer.importType(apolloTypeImports, '@apollo/client');
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
        if (this.options.lazyQueries) {
          this.generateLazyQueryHook(operation);
        }
        if (this.options.suspense) {
          this.generateSuspenseQueryHook(operation);
        }
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
    const optionsType = `QueryHookOptions<${resultType}, ${variablesType}>`;

    if (hasVariables) {
      this.printer.func(
        hookName,
        `${varsParam}, options?: Omit<${optionsType}, 'variables'>`,
        `QueryResult<${resultType}, ${variablesType}>`,
        () => {
          if (!this.options.includeDocuments) {
            this.printer.comment('TODO: Add your GraphQL document here');
            this.printer.line('const document = gql``;');
          }
          this.printer.line(`return useQuery<${resultType}, ${variablesType}>(${docName}, {`);
          this.printer.indent();
          this.printer.line('...options,');
          this.printer.line('variables,');
          this.printer.dedent();
          this.printer.line('});');
        }
      );
    } else {
      this.printer.func(
        hookName,
        `options?: ${optionsType}`,
        `QueryResult<${resultType}, ${variablesType}>`,
        () => {
          if (!this.options.includeDocuments) {
            this.printer.comment('TODO: Add your GraphQL document here');
            this.printer.line('const document = gql``;');
          }
          this.printer.line(
            `return useQuery<${resultType}, ${variablesType}>(${docName}, options);`
          );
        }
      );
    }
  }

  /**
   * Generate a lazy query hook
   */
  private generateLazyQueryHook(operation: IROperation): void {
    const hookName = `use${pascalCase(operation.name)}Lazy`;
    const variablesType = `${pascalCase(operation.name)}Variables`;
    const resultType = `${pascalCase(operation.name)}Result`;
    const docName = this.options.includeDocuments
      ? `${pascalCase(operation.name)}Document`
      : 'document';

    this.printer.jsdoc([`Lazy query hook for ${operation.name}`]);

    const optionsType = `LazyQueryHookOptions<${resultType}, ${variablesType}>`;

    this.printer.func(
      hookName,
      `options?: ${optionsType}`,
      `LazyQueryResultTuple<${resultType}, ${variablesType}>`,
      () => {
        if (!this.options.includeDocuments) {
          this.printer.comment('TODO: Add your GraphQL document here');
          this.printer.line('const document = gql``;');
        }
        this.printer.line(
          `return useLazyQuery<${resultType}, ${variablesType}>(${docName}, options);`
        );
      }
    );
    this.printer.blank();
  }

  /**
   * Generate a suspense query hook
   */
  private generateSuspenseQueryHook(operation: IROperation): void {
    const hookName = `use${pascalCase(operation.name)}Suspense`;
    const variablesType = `${pascalCase(operation.name)}Variables`;
    const resultType = `${pascalCase(operation.name)}Result`;
    const docName = this.options.includeDocuments
      ? `${pascalCase(operation.name)}Document`
      : 'document';

    this.printer.jsdoc([`Suspense query hook for ${operation.name}`]);

    const hasVariables = operation.variables.length > 0;
    const varsParam = hasVariables ? `variables: ${variablesType}` : '';
    const optionsType = `SuspenseQueryHookOptions<${resultType}, ${variablesType}>`;

    if (hasVariables) {
      this.printer.func(
        hookName,
        `${varsParam}, options?: Omit<${optionsType}, 'variables'>`,
        `{ data: ${resultType} }`,
        () => {
          if (!this.options.includeDocuments) {
            this.printer.comment('TODO: Add your GraphQL document here');
            this.printer.line('const document = gql``;');
          }
          this.printer.line(
            `return useSuspenseQuery<${resultType}, ${variablesType}>(${docName}, {`
          );
          this.printer.indent();
          this.printer.line('...options,');
          this.printer.line('variables,');
          this.printer.dedent();
          this.printer.line('});');
        }
      );
    } else {
      this.printer.func(hookName, `options?: ${optionsType}`, `{ data: ${resultType} }`, () => {
        if (!this.options.includeDocuments) {
          this.printer.comment('TODO: Add your GraphQL document here');
          this.printer.line('const document = gql``;');
        }
        this.printer.line(
          `return useSuspenseQuery<${resultType}, ${variablesType}>(${docName}, options);`
        );
      });
    }
    this.printer.blank();
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

    const optionsType = `MutationHookOptions<${resultType}, ${variablesType}>`;

    this.printer.func(
      hookName,
      `options?: ${optionsType}`,
      `MutationTuple<${resultType}, ${variablesType}>`,
      () => {
        if (!this.options.includeDocuments) {
          this.printer.comment('TODO: Add your GraphQL document here');
          this.printer.line('const document = gql``;');
        }
        this.printer.line(
          `return useMutation<${resultType}, ${variablesType}>(${docName}, options);`
        );
      }
    );
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
    const optionsType = `SubscriptionHookOptions<${resultType}, ${variablesType}>`;

    if (hasVariables) {
      this.printer.func(
        hookName,
        `${varsParam}, options?: Omit<${optionsType}, 'variables'>`,
        `SubscriptionResult<${resultType}, ${variablesType}>`,
        () => {
          if (!this.options.includeDocuments) {
            this.printer.comment('TODO: Add your GraphQL document here');
            this.printer.line('const document = gql``;');
          }
          this.printer.line(
            `return useSubscription<${resultType}, ${variablesType}>(${docName}, {`
          );
          this.printer.indent();
          this.printer.line('...options,');
          this.printer.line('variables,');
          this.printer.dedent();
          this.printer.line('});');
        }
      );
    } else {
      this.printer.func(
        hookName,
        `options?: ${optionsType}`,
        `SubscriptionResult<${resultType}, ${variablesType}>`,
        () => {
          if (!this.options.includeDocuments) {
            this.printer.comment('TODO: Add your GraphQL document here');
            this.printer.line('const document = gql``;');
          }
          this.printer.line(
            `return useSubscription<${resultType}, ${variablesType}>(${docName}, options);`
          );
        }
      );
    }
  }
}

/**
 * Create a new Apollo generator
 */
export function createApolloGenerator(
  schema: IRSchema,
  options: ApolloGeneratorOptions
): ApolloGenerator {
  return new ApolloGenerator(schema, options);
}
