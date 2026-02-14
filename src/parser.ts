import * as fs from 'fs';
import {
  ParsedAPISpec,
  ParsedEndpoint,
  ParsedParameter,
  ParsedRequestBody,
  ParsedResponse,
  ParsedSchema,
  ParsedProperty
} from './types';

/**
 * OpenAPI/Swagger Parser
 * Parses OpenAPI 3.x specifications and extracts relevant information
 */
export class OpenAPIParser {
  private spec: any;

  constructor(specPath: string) {
    const content = fs.readFileSync(specPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    if (!parsed.openapi && !parsed.swagger) {
      throw new Error('Invalid OpenAPI specification: missing openapi or swagger field');
    }

    this.spec = parsed;
  }

  /**
   * Parse the complete API specification
   */
  public parse(): ParsedAPISpec {
    const baseUrl = this.getBaseUrl();
    const endpoints = this.parseEndpoints();
    const schemas = this.parseSchemas();
    const securitySchemes = this.parseSecuritySchemes();

    return {
      title: this.spec.info?.title || 'API',
      version: this.spec.info?.version || '1.0.0',
      description: this.spec.info?.description,
      baseUrl,
      endpoints,
      schemas,
      securitySchemes
    };
  }

  /**
   * Extract base URL from the spec
   */
  private getBaseUrl(): string {
    // Try to get from servers
    if (this.spec.servers && this.spec.servers.length > 0) {
      return this.spec.servers[0].url;
    }

    // Try to construct from host and schemes
    if (this.spec.host) {
      const scheme = this.spec.schemes?.[0] || 'https';
      const basePath = this.spec.basePath || '';
      return `${scheme}://${this.spec.host}${basePath}`;
    }

    return 'https://api.example.com';
  }

  /**
   * Parse all endpoints from paths
   */
  private parseEndpoints(): ParsedEndpoint[] {
    const endpoints: ParsedEndpoint[] = [];

    if (!this.spec.paths) return endpoints;

    for (const [pathKey, pathItem] of Object.entries(this.spec.paths)) {
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

      for (const method of methods) {
        const operation = (pathItem as any)[method];
        if (!operation) continue;

        const endpoint = this.parseEndpoint(pathKey, method.toUpperCase(), operation);
        endpoints.push(endpoint);
      }
    }

    return endpoints;
  }

  /**
   * Parse a single endpoint
   */
  private parseEndpoint(path: string, method: string, operation: any): ParsedEndpoint {
    const parameters = this.parseParameters(operation.parameters);
    const requestBody = this.parseRequestBody(operation.requestBody);
    const responses = this.parseResponses(operation.responses);

    return {
      path,
      method,
      operationId: operation.operationId || this.generateOperationId(method, path),
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags || ['default'],
      parameters,
      requestBody,
      responses,
      security: operation.security?.map((s: any) => Object.keys(s || {})).flat() || []
    };
  }

  /**
   * Parse parameters
   */
  private parseParameters(parameters?: any[]): ParsedParameter[] {
    if (!parameters) return [];

    return parameters.map((param: any) => ({
      name: param.name,
      in: param.in || 'query',
      required: param.required || false,
      type: this.getSchemaType(param.schema),
      description: param.description,
      schema: param.schema
    }));
  }

  /**
   * Parse request body
   */
  private parseRequestBody(requestBody?: any): ParsedRequestBody | undefined {
    if (!requestBody) return undefined;

    const content = requestBody.content || {};
    const contentTypes = Object.keys(content);

    return {
      required: requestBody.required || false,
      contentTypes,
      schema: content[contentTypes[0]]?.schema,
      example: content[contentTypes[0]]?.example
    };
  }

  /**
   * Parse responses
   */
  private parseResponses(responses: any): ParsedResponse[] {
    if (!responses) return [];
    
    return Object.entries(responses).map(([statusCode, response]: [string, any]) => {
      const content = response.content || {};
      const contentTypes = Object.keys(content);

      return {
        statusCode,
        description: response.description || '',
        schema: content[contentTypes[0]]?.schema,
        example: content[contentTypes[0]]?.example
      };
    });
  }

  /**
   * Parse all schemas
   */
  private parseSchemas(): ParsedSchema[] {
    const schemas: ParsedSchema[] = [];
    const components = this.spec.components;

    if (!components?.schemas) return schemas;

    const schemaDefs = components.schemas;

    for (const [name, schema] of Object.entries(schemaDefs)) {
      const parsed = this.parseSchema(name, schema);
      schemas.push(parsed);
    }

    return schemas;
  }

  /**
   * Parse a single schema
   */
  private parseSchema(name: string, schema: any): ParsedSchema {
    const properties: ParsedProperty[] = [];
    
    if (schema.properties) {
      for (const [propName, prop] of Object.entries(schema.properties)) {
        const parsed = this.parseProperty(propName, prop);
        properties.push(parsed);
      }
    }

    return {
      name,
      type: schema.type || 'object',
      properties,
      required: schema.required || [],
      description: schema.description,
      example: schema.example,
      enum: schema.enum,
      format: schema.format,
      $ref: schema.$ref
    };
  }

  /**
   * Parse a single property
   */
  private parseProperty(name: string, schema: any): ParsedProperty {
    return {
      name,
      type: this.getSchemaType(schema),
      description: schema.description,
      required: false,
      format: schema.format,
      items: schema.items,
      enum: schema.enum,
      example: schema.example,
      $ref: schema.$ref,
      nullable: schema.nullable
    };
  }

  /**
   * Parse security schemes
   */
  private parseSecuritySchemes(): any {
    if (!this.spec.components?.securitySchemes) return {};

    return this.spec.components.securitySchemes;
  }

  /**
   * Get the type string from a schema
   */
  private getSchemaType(schema?: any): string {
    if (!schema) return 'any';
    if (schema.$ref) {
      const refParts = schema.$ref.split('/');
      return refParts[refParts.length - 1];
    }
    if (schema.type === 'array' && schema.items) {
      return `${this.getSchemaType(schema.items)}[]`;
    }
    return schema.type || 'any';
  }

  /**
   * Generate operation ID if not provided
   */
  private generateOperationId(method: string, path: string): string {
    const parts = path.split('/').filter(Boolean);
    const resource = parts[0] || 'default';
    return `${method.toLowerCase()}${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
  }
}
