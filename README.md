# API Client Generator

🤖 AI-Powered API Client Generator - Generates well-typed, idiomatic client libraries from OpenAPI specifications in multiple languages with proper error handling and examples.

## Features

- 📖 **OpenAPI 3.x Support** - Parse and generate from OpenAPI 3.0+ specifications
- 🌐 **Multi-Language Support** - Generate clients in TypeScript, Python, and Go
- 🔒 **Security** - Support for API Key, Bearer Token, and OAuth2 authentication
- ⚡ **Error Handling** - Comprehensive error types and retry logic
- 📝 **Examples** - Auto-generated usage examples for every endpoint
- 👀 **Watch Mode** - Auto-regenerate clients when specifications change
- 🔧 **CLI Interface** - Easy-to-use command-line interface

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/api-client-generator.git
cd api-client-generator

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Generate a Client

```bash
# Generate TypeScript client
npm start -- generate -i ./examples/openapi.json -o ./output -l typescript -n PetStore

# Generate Python client
npm start -- generate -i ./examples/openapi.json -o ./output -l python -n PetStore

# Generate Go client
npm start -- generate -i ./examples/openapi.json -o ./output -l go -n PetStore
```

### Watch Mode

Automatically regenerate clients when the specification file changes:

```bash
npm start -- watch -i ./examples/openapi.json -o ./output -l typescript -n PetStore
```

### Validate a Specification

```bash
npm start -- validate -i ./examples/openapi.json
```

### Initialize a Project

```bash
npm start -- init -n my-api-client -l typescript
```

## CLI Options

### generate

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--input` | `-i` | Input OpenAPI/Swagger specification file | Required |
| `--output` | `-o` | Output directory for generated client | Required |
| `--language` | `-l` | Target language (typescript, python, go) | Required |
| `--name` | `-n` | Client name for class/function names | APIClient |
| `--examples` | `-e` | Include code examples | false |
| `--errors` | `-h` | Include error handling | true |

### watch

Same options as `generate`, plus watches for file changes.

## Output Structure

```
output/
├── typescript/
│   ├── index.ts          # Main client
│   ├── types.ts          # Type definitions
│   ├── errors.ts         # Error classes
│   ├── examples.ts       # Usage examples
│   ├── package.json      # Package configuration
│   └── tsconfig.json    # TypeScript config
├── python/
│   ├── __init__.py      # Main client
│   ├── models.py         # Pydantic models
│   ├── exceptions.py     # Exception classes
│   ├── examples.py       # Usage examples
│   ├── setup.py         # Package setup
│   └── requirements.txt  # Python dependencies
└── go/
    ├── client.go         # Main client
    ├── types.go          # Type definitions
    ├── endpoints.go      # Endpoint methods
    ├── examples_test.go  # Usage examples
    └── go.mod           # Go module file
```

## API

### Using as a Library

```typescript
import { OpenAPIParser, CodeGeneratorEngine } from './src';

const parser = new OpenAPIParser('./api-spec.json');
const spec = parser.parse();

const config = {
  inputFile: './api-spec.json',
  outputDir: './output',
  language: 'typescript',
  clientName: 'MyAPIClient',
  includeExamples: true,
  includeErrorHandling: true,
  watchMode: false
};

const engine = new CodeGeneratorEngine(config, spec);
await engine.generate();
```

## Error Handling

Each generated client includes comprehensive error handling:

### TypeScript
- `ApiError` - Base error class
- `ApiRequestError` - Request-level errors
- `ApiResponseError` - Response-level errors
- `NetworkError` - Network connectivity issues
- `TimeoutError` - Request timeout

### Python
- `ApiError` - Base exception
- `NetworkError` - Network issues
- `TimeoutError` - Timeout issues
- `RateLimitError` - Rate limiting
- `AuthenticationError` - Auth failures
- `NotFoundError` - 404 errors

### Go
- `APIError` - All API errors
- Error codes: `ErrCodeRequestFailed`, `ErrCodeTimeout`, `ErrCodeNetwork`, etc.

## Supported Languages

### TypeScript
- Axios-based HTTP client
- Full type definitions
- JSDoc comments
- ESM/CommonJS support

### Python
- Requests library
- Pydantic models
- Type hints
- Comprehensive exceptions

### Go
- Standard library net/http
- Strongly typed structs
- Context support
- Error handling patterns

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT
