import { OpenAPIV3 } from 'openapi-types';

/**
 * Supported output languages for client generation
 */
export type OutputLanguage = 'typescript' | 'python' | 'go';

/**
 * Configuration for code generation
 */
export interface GeneratorConfig {
  inputFile: string;
  outputDir: string;
  language: OutputLanguage;
  clientName: string;
  includeExamples: boolean;
  includeErrorHandling: boolean;
  watchMode: boolean;
}

/**
 * Parsed API endpoint information
 */
export interface ParsedEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: ParsedParameter[];
  requestBody?: ParsedRequestBody;
  responses: ParsedResponse[];
  security: string[];
}

/**
 * Parsed parameter information
 */
export interface ParsedParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  type: string;
  description?: string;
  schema?: OpenAPIV3.SchemaObject;
}

/**
 * Parsed request body information
 */
export interface ParsedRequestBody {
  required: boolean;
  contentTypes: string[];
  schema?: OpenAPIV3.SchemaObject;
  example?: unknown;
}

/**
 * Parsed response information
 */
export interface ParsedResponse {
  statusCode: string;
  description: string;
  schema?: OpenAPIV3.SchemaObject;
  example?: unknown;
}

/**
 * Parsed schema information
 */
export interface ParsedSchema {
  name: string;
  type: string;
  properties: ParsedProperty[];
  required: string[];
  description?: string;
  example?: unknown;
  enum?: unknown[];
  format?: string;
  $ref?: string;
}

/**
 * Parsed property information
 */
export interface ParsedProperty {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  format?: string;
  items?: OpenAPIV3.SchemaObject;
  enum?: unknown[];
  example?: unknown;
  $ref?: string;
  nullable?: boolean;
}

/**
 * Complete parsed API specification
 */
export interface ParsedAPISpec {
  title: string;
  version: string;
  description?: string;
  baseUrl: string;
  endpoints: ParsedEndpoint[];
  schemas: ParsedSchema[];
  securitySchemes: Record<string, OpenAPIV3.SecuritySchemeObject>;
}

/**
 * Generator context passed to templates
 */
export interface GeneratorContext {
  config: GeneratorConfig;
  spec: ParsedAPISpec;
  endpointsByTag: Map<string, ParsedEndpoint[]>;
}
