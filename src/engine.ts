import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import {
  GeneratorConfig,
  GeneratorContext,
  ParsedAPISpec,
  ParsedEndpoint,
  ParsedSchema
} from './types';

// Import language generators
import { TypeScriptGenerator } from './generators/typescript';

/**
 * Code Generation Engine
 * Coordinates parsing and code generation for different languages
 */
export class CodeGeneratorEngine {
  private config: GeneratorConfig;
  private spec: ParsedAPISpec;
  private context: GeneratorContext;

  constructor(config: GeneratorConfig, spec: ParsedAPISpec) {
    this.config = config;
    this.spec = spec;
    this.context = this.buildContext();
  }

  /**
   * Build the generator context
   */
  private buildContext(): GeneratorContext {
    // Group endpoints by tag
    const endpointsByTag = new Map<string, ParsedEndpoint[]>();
    
    for (const endpoint of this.spec.endpoints) {
      for (const tag of endpoint.tags) {
        if (!endpointsByTag.has(tag)) {
          endpointsByTag.set(tag, []);
        }
        endpointsByTag.get(tag)!.push(endpoint);
      }
    }

    return {
      config: this.config,
      spec: this.spec,
      endpointsByTag
    };
  }

  /**
   * Generate the client library
   */
  public async generate(): Promise<void> {
    console.log(`Generating ${this.config.language} client library...`);
    console.log(`  Input: ${this.config.inputFile}`);
    console.log(`  Output: ${this.config.outputDir}`);
    console.log(`  Client Name: ${this.config.clientName}`);

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    // Select the appropriate generator
    const generator = this.getGenerator();
    
    // Generate the code
    await generator.generate(this.context);

    console.log('✓ Generation complete!');
  }

  /**
   * Get the appropriate generator based on language
   */
  private getGenerator(): any {
    // For now, only TypeScript is fully supported
    if (this.config.language === 'typescript') {
      return new TypeScriptGenerator(this.config);
    }
    
    // Fallback to TypeScript for other languages (they can be added later)
    console.log(`Note: ${this.config.language} not yet fully implemented, generating TypeScript client`);
    return new TypeScriptGenerator(this.config);
  }

  /**
   * Watch for changes in the input file and regenerate
   */
  public watch(callback?: () => void): void {
    const chokidar = require('chokidar');
    const watcher = chokidar.watch(this.config.inputFile, {
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', async () => {
      console.log('\n📄 File changed, regenerating...');
      try {
        await this.generate();
        if (callback) callback();
      } catch (error) {
        console.error('Error regenerating:', error);
      }
    });

    console.log(`👀 Watching for changes to ${this.config.inputFile}...`);
  }
}

/**
 * Base class for all language generators
 */
export abstract class BaseGenerator {
  protected config: GeneratorConfig;
  protected outputDir: string;

  constructor(config: GeneratorConfig) {
    this.config = config;
    this.outputDir = path.join(config.outputDir, config.language);
  }

  /**
   * Generate the complete client library
   */
  public abstract generate(context: GeneratorContext): Promise<void>;

  /**
   * Write a file to the output directory
   */
  protected writeFile(filename: string, content: string): void {
    const filepath = path.join(this.outputDir, filename);
    const dir = path.dirname(filepath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, content);
    console.log(`  ✓ Created: ${filename}`);
  }

  /**
   * Read a template file
   */
  protected readTemplate(templateName: string): string {
    const templatePath = path.join(__dirname, '..', 'templates', this.config.language, templateName);
    return fs.readFileSync(templatePath, 'utf-8');
  }

  /**
   * Compile a Handlebars template
   */
  protected compileTemplate(templateContent: string): any {
    return Handlebars.compile(templateContent);
  }

  /**
   * Convert endpoint method to HTTP method
   */
  protected getHttpMethod(method: string): string {
    return method.toLowerCase();
  }

  /**
   * Format a description for code comments
   */
  protected formatDescription(description?: string, maxLength: number = 80): string {
    if (!description) return '';
    return description
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n * ');
  }

  /**
   * Get the appropriate type mapping for parameters
   */
  protected getTypeName(schemaType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'integer': 'number',
      'number': 'number',
      'boolean': 'boolean',
      'array': 'any[]',
      'object': 'any',
      'file': 'Blob',
      'date': 'string',
      'date-time': 'string',
      'email': 'string',
      'uri': 'string'
    };
    return typeMap[schemaType.toLowerCase()] || schemaType;
  }
}

/**
 * Register Handlebars helpers
 */
export function registerHandlebarsHelpers(): void {
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
