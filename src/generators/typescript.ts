import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { GeneratorConfig, GeneratorContext, ParsedEndpoint, ParsedSchema } from '../types';

// Register helpers
import '../engine';

function registerHelpers(): void {
  // Convert to camelCase
  Handlebars.registerHelper('camelCase', (str: string) => {
    return str.replace(/[-_](.)/g, (_: any, c: string) => c.toUpperCase());
  });

  // Convert to PascalCase
  Handlebars.registerHelper('pascalCase', (str: string) => {
    return str.replace(/(.)(-|_)(.)/g, (_: any, a: string, b: string, c: string) => a + c.toUpperCase());
  });

  // Convert to snake_case
  Handlebars.registerHelper('snakeCase', (str: string) => {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  });

  // Convert to kebab-case
  Handlebars.registerHelper('kebabCase', (str: string) => {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  });

  // Check if array is not empty
  Handlebars.registerHelper('isNotEmpty', (arr: any) => {
    return arr && arr.length > 0;
  });

  // Get first element of array
  Handlebars.registerHelper('first', (arr: any) => {
    return arr && arr[0];
  });

  // Join array elements
  Handlebars.registerHelper('join', (arr: any, separator: string) => {
    return arr.join(separator);
  });

  // JSON stringify
  Handlebars.registerHelper('json', (obj: any) => {
    return JSON.stringify(obj, null, 2);
  });

  // Get status code category (2xx, 4xx, 5xx)
  Handlebars.registerHelper('statusCategory', (statusCode: string) => {
    if (statusCode.startsWith('2')) return 'success';
    if (statusCode.startsWith('4')) return 'clientError';
    if (statusCode.startsWith('5')) return 'serverError';
    return 'informational';
  });
}

registerHelpers();

/**
 * TypeScript Client Generator
 * Generates idiomatic TypeScript client libraries with proper types
 */
export class TypeScriptGenerator {
  private config: GeneratorConfig;
  private outputDir: string;
  private templates: Map<string, any> = new Map();

  constructor(config: GeneratorConfig) {
    this.config = config;
    this.outputDir = path.join(config.outputDir, config.language);
    this.loadTemplates();
  }

  /**
   * Load and compile all templates
   */
  private loadTemplates(): void {
    // Build client template as a string
    const clientTemplate = this.buildClientTemplate();
    const schemaTemplate = this.buildSchemaTemplate();

    this.templates.set('client', Handlebars.compile(clientTemplate));
    this.templates.set('schema', Handlebars.compile(schemaTemplate));
  }

  private buildClientTemplate(): string {
    return [
      "import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';",
      "{{#if includeErrorHandling}}",
      "import { ApiError, ApiRequestError, ApiResponseError, NetworkError, TimeoutError } from './errors';",
      "{{/if}}",
      "",
      "{{#each schemas}}",
      "// Schema: {{name}}",
      "export interface {{name}} {",
      "{{#each properties}}",
      "  /** {{description}} */",
      "  {{name}}{{#unless required}}?{{/unless}}: {{type}};",
      "{{/each}}",
      "}",
      "",
      "{{/each}}",
      "",
      "export interface ClientConfig {",
      "  baseURL: string;",
      "  timeout?: number;",
      "  headers?: Record<string, string>;",
      "  {{#if hasApiKey}}apiKey?: string;{{/if}}",
      "  {{#if hasBearer}}bearerToken?: string;{{/if}}",
      "}",
      "",
      "{{#if includeErrorHandling}}",
      "export class ApiError extends Error {",
      "  constructor(",
      "    message: string,",
      "    public statusCode?: number,",
      "    public response?: any",
      "  ) {",
      "    super(message);",
      "    this.name = 'ApiError';",
      "  }",
      "}",
      "",
      "export class ApiRequestError extends ApiError {",
      "  constructor(message: string, public request: any) {",
      "    super(message);",
      "    this.name = 'ApiRequestError';",
      "  }",
      "}",
      "",
      "export class ApiResponseError extends ApiError {",
      "  constructor(message: string, statusCode: number, response: any) {",
      "    super(message, statusCode, response);",
      "    this.name = 'ApiResponseError';",
      "  }",
      "}",
      "",
      "export class NetworkError extends ApiError {",
      "  constructor(message: string, public originalError?: Error) {",
      "    super(message);",
      "    this.name = 'NetworkError';",
      "  }",
      "}",
      "",
      "export class TimeoutError extends ApiError {",
      "  constructor(message: string = 'Request timed out') {",
      "    super(message);",
      "    this.name = 'TimeoutError';",
      "  }",
      "}",
      "{{/if}}",
      "",
      "{{#each endpointsByTag}}",
      "/**",
      " * {{description}}",
      " */",
      "export class {{className}}Client {",
      "  private client: AxiosInstance;",
      "",
      "  constructor(client: AxiosInstance) {",
      "    this.client = client;",
      "  }",
      "",
      "{{#each endpoints}}",
      "  /**",
      "   * {{summary}}",
      "   {{#if description}} * {{description}}{{/if}}",
      "   *",
      "   * @param params - Request parameters",
      "   * @returns Promise resolving to {{returnType}}",
      "   */",
      "  async {{methodName}}(params: any{{#if requestBody}}, body: any{{/if}}): Promise<{{returnType}}> {",
      "    {{#if includeErrorHandling}}",
      "    try {",
      "    {{/if}}",
      "    const config: AxiosRequestConfig = {",
      "      url: '{{path}}',",
      "      method: '{{method}}',",
      "    };",
      "",
      "    const response: AxiosResponse<any> = await this.client.request(config);",
      "    {{#if includeErrorHandling}}",
      "    return response.data;",
      "    } catch (error) {",
      "      throw this.handleError(error);",
      "    }",
      "    {{else}}",
      "    return response.data;",
      "    {{/if}}",
      "  }",
      "{{/each}}",
      "}",
      "{{/each}}",
      "",
      "export class {{clientName}} {",
      "  private client: AxiosInstance;",
      "{{#each endpointsByTag}}",
      "  public {{propertyName}}: {{className}}Client;",
      "{{/each}}",
      "",
      "  constructor(config: ClientConfig) {",
      "    this.client = axios.create({",
      "      baseURL: config.baseURL,",
      "      timeout: config.timeout || 30000,",
      "      headers: config.headers,",
      "    });",
      "{{#each endpointsByTag}}",
      "    this.{{propertyName}} = new {{className}}Client(this.client);",
      "{{/each}}",
      "  }",
      "",
      "  {{#if includeErrorHandling}}",
      "  private handleError(error: any): ApiError {",
      "    if (axios.isAxiosError(error)) {",
      "      const axiosError = error as AxiosError;",
      "      if (!axiosError.response) {",
      "        return new NetworkError('Network error');",
      "      }",
      "      return new ApiResponseError(",
      "        axiosError.message,",
      "        axiosError.response.status,",
      "        axiosError.response.data",
      "      );",
      "    }",
      "    return new ApiError('Unknown error occurred');",
      "  }",
      "  {{/if}}",
      "}",
      "",
      "export default {{clientName}};"
    ].join('\n');
  }

  private buildSchemaTemplate(): string {
    return [
      "/**",
      " * {{name}}",
      " {{#if description}} - {{description}}{{/if}}",
      " */",
      "export interface {{name}} {",
      "{{#each properties}}",
      "  /** {{description}} */",
      "  {{name}}{{#unless required}}?{{/unless}}: {{type}};",
      "{{/each}}",
      "}"
    ].join('\n');
  }

  /**
   * Generate the complete TypeScript client
   */
  public async generate(context: GeneratorContext): Promise<void> {
    const { config, spec, endpointsByTag } = context;

    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Generate schemas
    this.generateSchemas(spec.schemas);

    // Generate main client
    const clientCode = this.generateClientCode(context);
    this.writeFile('index.ts', clientCode);

    // Generate errors file
    if (config.includeErrorHandling) {
      this.generateErrorsFile();
    }

    // Generate types file
    this.generateTypesFile(context);

    // Generate examples
    if (config.includeExamples) {
      this.generateExamples(context);
    }

    // Generate package.json for the generated client
    this.generatePackageJson(config);
  }

  /**
   * Write a file to the output directory
   */
  private writeFile(filename: string, content: string): void {
    const filepath = path.join(this.outputDir, filename);
    const dir = path.dirname(filepath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, content);
    console.log(`  ✓ Created: ${filename}`);
  }

  /**
   * Generate the main client code
   */
  private generateClientCode(context: GeneratorContext): string {
    const { config, spec, endpointsByTag } = context;

    // Prepare endpoints grouped by tag
    const endpointsGrouped = Array.from(endpointsByTag.entries()).map(([tag, endpoints]) => ({
      description: this.capitalizeFirst(tag),
      className: this.toPascalCase(tag) + 'Client',
      propertyName: this.toCamelCase(tag),
      endpoints: endpoints.map(ep => this.formatEndpoint(ep, context)),
      paramTypeName: this.toPascalCase(tag) + 'Params'
    }));

    // Check security schemes
    const hasApiKey = Object.keys(spec.securitySchemes).some(
      key => spec.securitySchemes[key]?.type === 'apiKey'
    );
    const hasBearer = Object.keys(spec.securitySchemes).some(
      key => spec.securitySchemes[key]?.type === 'http' && spec.securitySchemes[key]?.scheme === 'bearer'
    );

    const template = this.templates.get('client');
    return template({
      clientName: config.clientName,
      baseUrl: spec.baseUrl,
      version: spec.version,
      description: spec.description,
      schemas: spec.schemas.map(s => this.formatSchema(s)),
      endpointsByTag: endpointsGrouped,
      includeErrorHandling: config.includeErrorHandling,
      includeExamples: config.includeExamples,
      hasApiKey,
      hasBearer
    });
  }

  /**
   * Format an endpoint for the template
   */
  private formatEndpoint(endpoint: ParsedEndpoint, context: GeneratorContext): any {
    const returnType = this.getReturnType(endpoint);
    
    return {
      methodName: this.toCamelCase(endpoint.operationId),
      path: endpoint.path,
      method: endpoint.method,
      summary: endpoint.summary || endpoint.operationId,
      description: this.formatDescription(endpoint.description),
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      returnType,
      example: this.generateExample(endpoint, context)
    };
  }

  /**
   * Get return type for an endpoint
   */
  private getReturnType(endpoint: ParsedEndpoint): string {
    const successResponse = endpoint.responses.find(r => r.statusCode.startsWith('2'));
    if (!successResponse || !successResponse.schema) return 'any';
    
    const schema = successResponse.schema as any;
    if (schema.$ref) {
      const refParts = schema.$ref.split('/');
      return refParts[refParts.length - 1];
    }
    if (schema.type === 'array') {
      const items = schema.items as any;
      if (items && items.$ref) {
        const refParts = items.$ref.split('/');
        return refParts[refParts.length - 1] + '[]';
      }
      return 'any[]';
    }
    return 'any';
  }

  /**
   * Format a schema for the template
   */
  private formatSchema(schema: ParsedSchema): any {
    return {
      name: schema.name,
      description: schema.description || schema.name,
      properties: schema.properties.map(prop => ({
        name: prop.name,
        type: this.mapType(prop.type, prop.nullable),
        required: schema.required.includes(prop.name),
        description: prop.description || prop.name
      }))
    };
  }

  /**
   * Map OpenAPI type to TypeScript type
   */
  private mapType(type: string, nullable?: boolean): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'integer': 'number',
      'number': 'number',
      'boolean': 'boolean',
      'array': 'any[]',
      'object': 'Record<string, any>',
      'file': 'Blob',
      'date': 'string',
      'date-time': 'string'
    };
    
    let tsType = typeMap[type.toLowerCase()] || type;
    if (nullable) tsType += ' | null';
    return tsType;
  }

  /**
   * Generate example code for an endpoint
   */
  private generateExample(endpoint: ParsedEndpoint, context: GeneratorContext): string {
    const clientName = context.config.clientName;
    const methodName = this.toCamelCase(endpoint.operationId);
    
    let example = '// Create client\n';
    example += `const client = new ${clientName}({ baseURL: '${context.spec.baseUrl}' });\n\n`;
    example += `// Call ${endpoint.summary || endpoint.operationId}\n`;
    example += `const result = await client.${methodName}();\n`;
    example += 'console.log(result);';
    
    return example;
  }

  /**
   * Format a description for code comments
   */
  private formatDescription(description?: string): string {
    if (!description) return '';
    return description.split('\n').map(line => line.trim()).filter(Boolean).join(' ');
  }

  /**
   * Generate schemas file
   */
  private generateSchemas(schemas: ParsedSchema[]): void {
    if (schemas.length === 0) return;

    const content = schemas.map(schema => {
      const properties = schema.properties.map(prop => {
        const tsType = this.mapType(prop.type, prop.nullable);
        const required = schema.required.includes(prop.name);
        return `  /** ${prop.description || prop.name} */\n  ${prop.name}${required ? '' : '?'}: ${tsType};`;
      }).join('\n');

      return `/** ${schema.description || schema.name} */\nexport interface ${schema.name} {\n${properties}\n}`;
    }).join('\n\n');

    this.writeFile('types.ts', content);
  }

  /**
   * Generate errors file
   */
  private generateErrorsFile(): void {
    const errorsContent = [
      "import { AxiosError } from 'axios';",
      "",
      "export class ApiError extends Error {",
      "  constructor(",
      "    message: string,",
      "    public statusCode?: number,",
      "    public response?: any",
      "  ) {",
      "    super(message);",
      "    this.name = 'ApiError';",
      "  }",
      "}",
      "",
      "export class ApiRequestError extends ApiError {",
      "  constructor(message: string, public request: any) {",
      "    super(message);",
      "    this.name = 'ApiRequestError';",
      "  }",
      "}",
      "",
      "export class ApiResponseError extends ApiError {",
      "  constructor(message: string, statusCode: number, response: any) {",
      "    super(message, statusCode, response);",
      "    this.name = 'ApiResponseError';",
      "  }",
      "}",
      "",
      "export class NetworkError extends ApiError {",
      "  constructor(message: string, public originalError?: Error) {",
      "    super(message);",
      "    this.name = 'NetworkError';",
      "  }",
      "}",
      "",
      "export class TimeoutError extends ApiError {",
      "  constructor(message: string = 'Request timed out') {",
      "    super(message);",
      "    this.name = 'TimeoutError';",
      "  }",
      "}",
      "",
      "export type ErrorType = ApiError | ApiRequestError | ApiResponseError | NetworkError | TimeoutError;",
      "",
      "export function isApiError(error: any): error is ApiError {",
      "  return error instanceof ApiError;",
      "}",
      "",
      "export function isRetryableError(error: any): boolean {",
      "  if (error instanceof NetworkError || error instanceof TimeoutError) {",
      "    return true;",
      "  }",
      "  if (error instanceof ApiResponseError && error.statusCode && error.statusCode >= 500) {",
      "    return true;",
      "  }",
      "  return false;",
      "}"
    ].join('\n');

    this.writeFile('errors.ts', errorsContent);
  }

  /**
   * Generate types file
   */
  private generateTypesFile(context: GeneratorContext): void {
    const { spec } = context;
    
    let content = `// Auto-generated types for ${spec.title}\n// Version: ${spec.version}\n\n`;

    context.endpointsByTag.forEach((endpoints, tag) => {
      const typeName = this.toPascalCase(tag) + 'Params';
      content += `export interface ${typeName} {\n`;
      
      endpoints.forEach(ep => {
        ep.parameters.forEach(param => {
          const tsType = this.mapType(param.type);
          content += `  /** ${param.description || param.name} */\n`;
          content += `  ${param.name}${param.required ? '' : '?'}: ${tsType};\n`;
        });
      });
      
      content += `}\n\n`;
    });

    this.writeFile('params.ts', content);
  }

  /**
   * Generate examples file
   */
  private generateExamples(context: GeneratorContext): void {
    const { spec, endpointsByTag } = context;
    
    let content = `// Auto-generated examples for ${spec.title}\n// Version: ${spec.version}\n\n`;
    content += `import { ${context.config.clientName} } from './index';\n\n`;
    content += `// Create client instance\n`;
    content += `const client = new ${context.config.clientName}({\n`;
    content += `  baseURL: '${spec.baseUrl}',\n`;
    content += `  timeout: 30000,\n`;
    content += `});\n\n`;

    endpointsByTag.forEach((endpoints, tag) => {
      content += `// ${this.capitalizeFirst(tag)} endpoints\n`;
      
      endpoints.forEach(ep => {
        content += `// ${ep.summary || ep.operationId}\n`;
        content += `// ${ep.method} ${ep.path}\n`;
        content += this.generateExample(ep, context) + '\n\n';
      });
    });

    this.writeFile('examples.ts', content);
  }

  /**
   * Generate package.json for the generated client
   */
  private generatePackageJson(config: GeneratorConfig): void {
    const packageJson = {
      name: `${config.clientName.toLowerCase()}-client`,
      version: '1.0.0',
      description: `Auto-generated TypeScript client for ${config.clientName}`,
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc',
        prepare: 'npm run build'
      },
      dependencies: {
        axios: '^1.6.0'
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        typescript: '^5.0.0'
      }
    };

    this.writeFile('package.json', JSON.stringify(packageJson, null, 2));
    this.writeFile('tsconfig.json', JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        declaration: true,
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist']
    }, null, 2));
  }

  /**
   * Utility: Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (_, c) => c.toUpperCase())
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
  }

  /**
   * Utility: Convert to camelCase
   */
  private toCamelCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (_, c) => c.toLowerCase())
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
  }

  /**
   * Utility: Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
