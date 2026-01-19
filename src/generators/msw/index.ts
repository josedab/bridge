/**
 * MSW (Mock Service Worker) generator
 *
 * Generates request handlers and mock data factories for testing with MSW.
 */

import type { IRSchema } from '../../ir/types.js';
import { BaseGenerator, type GeneratorOptions } from '../base.js';
import { FakerEmitter } from './faker-emitter.js';
import { HandlerEmitter } from './handler-emitter.js';

export { FakerEmitter } from './faker-emitter.js';
export { HandlerEmitter } from './handler-emitter.js';

/** MSW generator options */
export interface MswGeneratorOptions extends GeneratorOptions {
  /** Base URL for the API */
  baseUrl?: string;
  /** Include faker-based mock data generators */
  includeFakers?: boolean;
}

/**
 * MSW generator for creating request handlers and mock data
 */
export class MswGenerator extends BaseGenerator {
  declare protected options: MswGeneratorOptions;

  constructor(schema: IRSchema, options: MswGeneratorOptions) {
    super(schema, options);
  }

  get name(): string {
    return 'MSW mocks';
  }

  get filename(): string {
    return 'mocks.ts';
  }

  generate(): void {
    this.addHeader();
    this.generateImports();
    this.printer.blank();

    // Generate mock data factories
    if (this.options.includeFakers !== false) {
      this.generateTypeImports();
      this.printer.blank();

      const fakerEmitter = new FakerEmitter(this.printer, this.schema.types);
      fakerEmitter.emitAll();
    }

    // Generate request handlers
    if (this.schema.endpoints.length > 0) {
      const handlerEmitter = new HandlerEmitter(
        this.printer,
        this.schema.types,
        this.options.baseUrl ?? this.schema.metadata.baseUrl ?? ''
      );
      handlerEmitter.emitAll(this.schema.endpoints);
    }
  }

  /**
   * Generate MSW imports
   */
  private generateImports(): void {
    this.printer.line("import { http, HttpResponse } from 'msw';");
  }

  /**
   * Generate type imports from the types file
   */
  private generateTypeImports(): void {
    const typeNames = Array.from(this.schema.types.keys()).filter((name) => {
      const type = this.schema.types.get(name);
      return type?.kind === 'object';
    });

    if (typeNames.length > 0) {
      this.printer.importType(typeNames, './types.js');
    }
  }
}

/**
 * Create a new MSW generator
 */
export function createMswGenerator(schema: IRSchema, options: MswGeneratorOptions): MswGenerator {
  return new MswGenerator(schema, options);
}
