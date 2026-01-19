/**
 * Authentication helpers generator
 * Generates type-safe auth helpers based on OpenAPI security schemes
 */

import type { IRSchema, IRSecurityScheme } from '../../ir/types.js';
import { BaseGenerator, type GeneratorOptions } from '../base.js';
import { pascalCase, camelCase } from '../../utils/naming.js';
import { logger } from '../../utils/logger.js';

export interface AuthGeneratorOptions extends GeneratorOptions {
  /** Generate middleware-style functions */
  middleware?: boolean;
}

/**
 * Authentication helpers generator
 */
export class AuthGenerator extends BaseGenerator {
  declare protected options: AuthGeneratorOptions;

  constructor(schema: IRSchema, options: AuthGeneratorOptions) {
    super(schema, options);
  }

  get name(): string {
    return 'Auth helpers';
  }

  get filename(): string {
    return 'auth.ts';
  }

  generate(): void {
    const schemes = this.schema.securitySchemes;
    if (!schemes || schemes.size === 0) {
      logger.warn('No security schemes found in schema');
      this.printer.comment('No security schemes defined');
      return;
    }

    this.addHeader();
    this.generateClientConfigType();
    this.printer.blank();

    // Generate helpers for each security scheme
    for (const [name, scheme] of schemes) {
      this.generateSecuritySchemeHelper(name, scheme);
      this.printer.blank();
    }

    // Generate combined auth config type
    this.generateAuthConfigType(schemes);
  }

  /**
   * Generate the ClientConfig type
   */
  private generateClientConfigType(): void {
    this.printer.jsdoc(['Configuration for API client authentication']);
    this.printer.interface('ClientAuthConfig', () => {
      this.printer.jsdoc(['Headers to include in requests']);
      this.printer.line('headers?: Record<string, string>;');
      this.printer.jsdoc(['Query parameters to include in requests']);
      this.printer.line('query?: Record<string, string>;');
      this.printer.jsdoc(['Cookies to include in requests']);
      this.printer.line('cookies?: Record<string, string>;');
    });
  }

  /**
   * Generate helper function for a security scheme
   */
  private generateSecuritySchemeHelper(name: string, scheme: IRSecurityScheme): void {
    const funcName = `with${pascalCase(name)}`;

    switch (scheme.type) {
      case 'apiKey':
        this.generateApiKeyHelper(funcName, scheme);
        break;
      case 'http':
        this.generateHttpHelper(funcName, scheme);
        break;
      case 'oauth2':
        this.generateOAuth2Helper(funcName, scheme);
        break;
      case 'openIdConnect':
        this.generateOpenIdConnectHelper(funcName, scheme);
        break;
    }
  }

  /**
   * Generate API key authentication helper
   */
  private generateApiKeyHelper(funcName: string, scheme: IRSecurityScheme): void {
    const keyName = scheme.apiKeyName || 'api_key';
    const location = scheme.apiKeyIn || 'header';

    if (scheme.description) {
      this.printer.jsdoc([scheme.description]);
    } else {
      this.printer.jsdoc([`Add API key authentication (${location}: ${keyName})`]);
    }

    this.printer.func(funcName, 'apiKey: string', 'ClientAuthConfig', () => {
      this.printer.line('return {');
      this.printer.indent();

      switch (location) {
        case 'header':
          this.printer.line(`headers: { '${keyName}': apiKey },`);
          break;
        case 'query':
          this.printer.line(`query: { '${keyName}': apiKey },`);
          break;
        case 'cookie':
          this.printer.line(`cookies: { '${keyName}': apiKey },`);
          break;
      }

      this.printer.dedent();
      this.printer.line('};');
    });
  }

  /**
   * Generate HTTP authentication helper
   */
  private generateHttpHelper(funcName: string, scheme: IRSecurityScheme): void {
    const httpScheme = scheme.httpScheme || 'bearer';

    if (scheme.description) {
      this.printer.jsdoc([scheme.description]);
    } else {
      this.printer.jsdoc([`Add ${httpScheme} authentication`]);
    }

    switch (httpScheme) {
      case 'bearer':
        this.printer.func(funcName, 'token: string', 'ClientAuthConfig', () => {
          this.printer.line('return {');
          this.printer.indent();
          this.printer.line('headers: { Authorization: `Bearer ${token}` },');
          this.printer.dedent();
          this.printer.line('};');
        });
        break;

      case 'basic':
        this.printer.func(
          funcName,
          'username: string, password: string',
          'ClientAuthConfig',
          () => {
            this.printer.line('const credentials = btoa(`${username}:${password}`);');
            this.printer.line('return {');
            this.printer.indent();
            this.printer.line('headers: { Authorization: `Basic ${credentials}` },');
            this.printer.dedent();
            this.printer.line('};');
          }
        );
        break;

      default:
        // Generic HTTP auth
        this.printer.func(funcName, 'credentials: string', 'ClientAuthConfig', () => {
          this.printer.line('return {');
          this.printer.indent();
          this.printer.line(
            `headers: { Authorization: \`${pascalCase(httpScheme)} \${credentials}\` },`
          );
          this.printer.dedent();
          this.printer.line('};');
        });
    }
  }

  /**
   * Generate OAuth2 authentication helper
   */
  private generateOAuth2Helper(funcName: string, scheme: IRSecurityScheme): void {
    if (scheme.description) {
      this.printer.jsdoc([scheme.description]);
    } else {
      this.printer.jsdoc(['Add OAuth2 bearer token authentication']);
    }

    // Generate main token helper
    this.printer.func(funcName, 'accessToken: string', 'ClientAuthConfig', () => {
      this.printer.line('return {');
      this.printer.indent();
      this.printer.line('headers: { Authorization: `Bearer ${accessToken}` },');
      this.printer.dedent();
      this.printer.line('};');
    });

    // Generate OAuth2 configuration type if flows are defined
    if (scheme.oauth2Flows && scheme.oauth2Flows.length > 0) {
      this.printer.blank();
      this.generateOAuth2Config(scheme);
    }
  }

  /**
   * Generate OAuth2 configuration type
   */
  private generateOAuth2Config(scheme: IRSecurityScheme): void {
    if (!scheme.oauth2Flows) return;

    const flows = scheme.oauth2Flows;
    const configName = `${pascalCase(scheme.name)}OAuth2Config`;

    this.printer.jsdoc(['OAuth2 configuration for this security scheme']);
    this.printer.interface(configName, () => {
      for (const flow of flows) {
        this.printer.jsdoc([`${flow.type} flow configuration`]);
        this.printer.line(`${camelCase(flow.type)}?: {`);
        this.printer.indent();

        if (flow.authorizationUrl) {
          this.printer.line(`authorizationUrl: '${flow.authorizationUrl}';`);
        }
        if (flow.tokenUrl) {
          this.printer.line(`tokenUrl: '${flow.tokenUrl}';`);
        }
        if (flow.refreshUrl) {
          this.printer.line(`refreshUrl: '${flow.refreshUrl}';`);
        }
        if (flow.scopes.size > 0) {
          this.printer.line('scopes: {');
          this.printer.indent();
          for (const [scope, description] of flow.scopes) {
            this.printer.jsdoc([description]);
            this.printer.line(`${scope}: string;`);
          }
          this.printer.dedent();
          this.printer.line('};');
        }

        this.printer.dedent();
        this.printer.line('};');
      }
    });

    // Generate config constant
    this.printer.blank();
    this.printer.jsdoc(['OAuth2 configuration']);
    this.printer.const(`${camelCase(scheme.name)}OAuth2Config`, `{`, configName);

    // Need to manually close the const and add values
    this.printer.indent();
    for (const flow of flows) {
      this.printer.line(`${camelCase(flow.type)}: {`);
      this.printer.indent();

      if (flow.authorizationUrl) {
        this.printer.line(`authorizationUrl: '${flow.authorizationUrl}',`);
      }
      if (flow.tokenUrl) {
        this.printer.line(`tokenUrl: '${flow.tokenUrl}',`);
      }
      if (flow.refreshUrl) {
        this.printer.line(`refreshUrl: '${flow.refreshUrl}',`);
      }
      if (flow.scopes.size > 0) {
        this.printer.line('scopes: {');
        this.printer.indent();
        for (const [scope, description] of flow.scopes) {
          this.printer.line(`${scope}: '${description}',`);
        }
        this.printer.dedent();
        this.printer.line('},');
      }

      this.printer.dedent();
      this.printer.line('},');
    }
    this.printer.dedent();
    this.printer.line('};');
  }

  /**
   * Generate OpenID Connect authentication helper
   */
  private generateOpenIdConnectHelper(funcName: string, scheme: IRSecurityScheme): void {
    if (scheme.description) {
      this.printer.jsdoc([scheme.description]);
    } else {
      this.printer.jsdoc(['Add OpenID Connect bearer token authentication']);
    }

    this.printer.func(funcName, 'idToken: string', 'ClientAuthConfig', () => {
      this.printer.line('return {');
      this.printer.indent();
      this.printer.line('headers: { Authorization: `Bearer ${idToken}` },');
      this.printer.dedent();
      this.printer.line('};');
    });

    // Generate discovery URL constant if available
    if (scheme.openIdConnectUrl) {
      this.printer.blank();
      this.printer.jsdoc(['OpenID Connect discovery URL']);
      this.printer.line(
        `export const ${camelCase(scheme.name)}DiscoveryUrl = '${scheme.openIdConnectUrl}';`
      );
    }
  }

  /**
   * Generate combined auth config type
   */
  private generateAuthConfigType(schemes: Map<string, IRSecurityScheme>): void {
    this.printer.jsdoc(['Union type of all available authentication methods']);

    const authTypes: string[] = [];
    for (const [name] of schemes) {
      authTypes.push(`'${name}'`);
    }

    this.printer.typeAlias('AuthMethod', authTypes.join(' | '));
    this.printer.blank();

    // Generate helper to merge multiple auth configs
    this.printer.jsdoc(['Merge multiple authentication configurations']);
    this.printer.func(
      'mergeAuthConfigs',
      '...configs: ClientAuthConfig[]',
      'ClientAuthConfig',
      () => {
        this.printer.line('return configs.reduce((merged, config) => ({');
        this.printer.indent();
        this.printer.line('headers: { ...merged.headers, ...config.headers },');
        this.printer.line('query: { ...merged.query, ...config.query },');
        this.printer.line('cookies: { ...merged.cookies, ...config.cookies },');
        this.printer.dedent();
        this.printer.line('}), { headers: {}, query: {}, cookies: {} });');
      }
    );
  }
}

/**
 * Create a new auth generator
 */
export function createAuthGenerator(
  schema: IRSchema,
  options: AuthGeneratorOptions
): AuthGenerator {
  return new AuthGenerator(schema, options);
}
