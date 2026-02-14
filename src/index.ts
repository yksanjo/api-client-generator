/**
 * API Client Generator
 * 
 * AI-Powered API Client Generator - Generates typed, idiomatic client libraries
 * from OpenAPI specifications in multiple languages with proper error handling
 * and examples.
 * 
 * @package api-client-generator
 * @version 1.0.0
 */

// Core exports
export { OpenAPIParser } from './parser';
export { CodeGeneratorEngine, BaseGenerator, registerHandlebarsHelpers } from './engine';

// Generators
export { TypeScriptGenerator } from './generators/typescript';

// Types
export * from './types';
