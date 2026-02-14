#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { OpenAPIParser } from './parser';
import { CodeGeneratorEngine } from './engine';
import { GeneratorConfig, OutputLanguage } from './types';

const program = new Command();

program
  .name('apigen')
  .description('AI-Powered API Client Generator - Generates typed client libraries from OpenAPI specifications')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate client library from OpenAPI specification')
  .requiredOption('-i, --input <file>', 'Input OpenAPI/Swagger specification file (JSON or YAML)')
  .requiredOption('-o, --output <directory>', 'Output directory for generated client')
  .requiredOption('-l, --language <language>', 'Target language (typescript, python, go)')
  .option('-n, --name <name>', 'Client name (used for class/function names)', 'APIClient')
  .option('-e, --examples', 'Include code examples', false)
  .option('-h, --errors', 'Include error handling', true)
  .action(async (options) => {
    try {
      await generateClient(options);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Watch for changes and regenerate client library')
  .requiredOption('-i, --input <file>', 'Input OpenAPI/Swagger specification file')
  .requiredOption('-o, --output <directory>', 'Output directory for generated client')
  .requiredOption('-l, --language <language>', 'Target language (typescript, python, go)')
  .option('-n, --name <name>', 'Client name', 'APIClient')
  .option('-e, --examples', 'Include code examples', false)
  .option('-h, --errors', 'Include error handling', true)
  .action(async (options) => {
    try {
      await watchAndGenerate(options);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new API client project')
  .requiredOption('-n, --name <name>', 'Project name')
  .option('-l, --language <language>', 'Default language', 'typescript')
  .action(async (options) => {
    try {
      await initProject(options);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate an OpenAPI specification file')
  .requiredOption('-i, --input <file>', 'Input OpenAPI/Swagger specification file')
  .action(async (options) => {
    try {
      await validateSpec(options.input);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

/**
 * Generate client library
 */
async function generateClient(options: any): Promise<void> {
  const inputFile = path.resolve(options.input);
  const outputDir = path.resolve(options.output);
  const language = options.language as OutputLanguage;
  const clientName = options.name;
  const includeExamples = options.examples;
  const includeErrorHandling = options.errors;

  // Validate input file
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }

  // Validate language
  const validLanguages: OutputLanguage[] = ['typescript', 'python', 'go'];
  if (!validLanguages.includes(language)) {
    throw new Error(`Invalid language: ${language}. Supported: ${validLanguages.join(', ')}`);
  }

  console.log('\n🚀 API Client Generator');
  console.log('═'.repeat(50));
  
  // Parse the OpenAPI spec
  console.log('\n📖 Parsing OpenAPI specification...');
  const parser = new OpenAPIParser(inputFile);
  const spec = parser.parse();
  
  console.log(`  ✓ Loaded: ${spec.title} v${spec.version}`);
  console.log(`  ✓ Base URL: ${spec.baseUrl}`);
  console.log(`  ✓ Endpoints: ${spec.endpoints.length}`);
  console.log(`  ✓ Schemas: ${spec.schemas.length}`);

  // Configure generator
  const config: GeneratorConfig = {
    inputFile,
    outputDir,
    language,
    clientName,
    includeExamples,
    includeErrorHandling,
    watchMode: false
  };

  // Generate the client
  console.log(`\n🔧 Generating ${language} client...`);
  const engine = new CodeGeneratorEngine(config, spec);
  await engine.generate();

  console.log('\n✅ Generation complete!');
  console.log(`\n📁 Output: ${outputDir}/${language}`);
  console.log('\n📝 Next steps:');
  console.log(`  1. cd ${outputDir}/${language}`);
  console.log('  2. Install dependencies:');
  if (language === 'typescript') {
    console.log('     npm install');
    console.log('     npm run build');
  } else if (language === 'python') {
    console.log('     pip install -r requirements.txt');
  } else if (language === 'go') {
    console.log('     go mod download');
  }
}

/**
 * Watch and regenerate on changes
 */
async function watchAndGenerate(options: any): Promise<void> {
  const inputFile = path.resolve(options.input);
  const outputDir = path.resolve(options.output);
  const language = options.language as OutputLanguage;
  const clientName = options.name;
  const includeExamples = options.examples;
  const includeErrorHandling = options.errors;

  // Validate input file
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }

  console.log('\n👀 Watch Mode - Press Ctrl+C to stop');
  console.log('═'.repeat(50));
  
  // Parse the OpenAPI spec
  const parser = new OpenAPIParser(inputFile);
  const spec = parser.parse();
  
  console.log(`\n📖 Loaded: ${spec.title} v${spec.version}`);
  console.log(`  ✓ Endpoints: ${spec.endpoints.length}`);

  // Configure generator
  const config: GeneratorConfig = {
    inputFile,
    outputDir,
    language,
    clientName,
    includeExamples,
    includeErrorHandling,
    watchMode: true
  };

  // Generate the client
  const engine = new CodeGeneratorEngine(config, spec);
  await engine.generate();

  // Watch for changes
  engine.watch(() => {
    console.log('\n✨ Regeneration complete!');
  });
}

/**
 * Initialize a new project
 */
async function initProject(options: any): Promise<void> {
  const projectName = options.name;
  const defaultLanguage = options.language;

  console.log('\n📦 Initializing API Client Project');
  console.log('═'.repeat(50));

  // Create project directory
  const projectDir = path.join(process.cwd(), projectName);
  if (fs.existsSync(projectDir)) {
    throw new Error(`Directory already exists: ${projectDir}`);
  }

  fs.mkdirSync(projectDir, { recursive: true });

  // Create config file
  const config = {
    projectName,
    language: defaultLanguage,
    version: '1.0.0'
  };

  fs.writeFileSync(
    path.join(projectDir, 'apigen.config.json'),
    JSON.stringify(config, null, 2)
  );

  // Create .gitignore
  const gitignore = `node_modules/
dist/
build/
*.pyc
__pycache__/
.go/
*.egg-info/
.vscode/
.idea/
*.log
`;

  fs.writeFileSync(path.join(projectDir, '.gitignore'), gitignore);

  console.log(`\n✅ Project initialized: ${projectName}`);
  console.log('\n📝 Next steps:');
  console.log(`  1. cd ${projectName}`);
  console.log('  2. Add your OpenAPI spec file');
  console.log('  3. Run: apigen generate -i api.yaml -o ./clients -l typescript');
}

/**
 * Validate an OpenAPI specification
 */
async function validateSpec(inputFile: string): Promise<void> {
  const resolvedPath = path.resolve(inputFile);
  
  console.log('\n🔍 Validating OpenAPI Specification');
  console.log('═'.repeat(50));

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  try {
    const parser = new OpenAPIParser(resolvedPath);
    const spec = parser.parse();

    console.log('\n✅ Validation passed!');
    console.log(`\n📋 Summary:`);
    console.log(`  Title: ${spec.title}`);
    console.log(`  Version: ${spec.version}`);
    console.log(`  Base URL: ${spec.baseUrl}`);
    console.log(`  Endpoints: ${spec.endpoints.length}`);
    console.log(`  Schemas: ${spec.schemas.length}`);
    console.log(`  Security Schemes: ${Object.keys(spec.securitySchemes).length}`);

    // List endpoints
    console.log('\n📡 Endpoints:');
    spec.endpoints.forEach(ep => {
      console.log(`  ${ep.method.toUpperCase().padEnd(7)} ${ep.path} → ${ep.operationId}`);
    });

  } catch (error) {
    console.error('\n❌ Validation failed!');
    throw error;
  }
}
