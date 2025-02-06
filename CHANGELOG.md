# Changelog

All notable changes to MCP Reasoner will be documented in this file.

Note: Changelog is not complete and may be updated at any time for any reason. Read our [docs.md](docs.md) for more up to date information.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2025-02-06

### Added
- Major codebase cleanup and reorganization
  - Improved directory structure
  - Better type safety
  - Cleaner strategy implementations
- Enhanced GPRO implementation
  - Improved prompting system
  - Better reasoning context handling
  - Enhanced metrics collection
- Groq integration improvements
  - Switched from OpenRouter to direct Groq SDK
  - Added streaming support
  - Enhanced error handling
  - Better response formatting

### Changed
- Refactored strategy hierarchy
  - Cleaner inheritance structure
  - Better separation of concerns
  - Improved type definitions
- Updated configuration handling
  - Centralized config management
  - Better default values
  - Improved type safety

### Fixed
- Various TypeScript type issues
- JSON handling in responses
- Strategy switching logic
- Metrics collection accuracy

## [2.2.0] - 2025-02-10

## [2.1.0] - 2025-01-27

### Added
- r1-sonnet hybrid reasoning strategy
  - r1-sonnet passes in your prompt to deepseek/deepseek-r1 and returns the response for Claude to use
- new tool schema specifically for r1-sonnet

## [2.0.0] - 2025-01-06

### Added
- Initial release of MCP Reasoner
- Core reasoning engine with state management
- Three reasoning strategies:
  - Beam Search
  - Monte Carlo Tree Search (MCTS)
  - MCTS Alpha (experimental)
- Comprehensive documentation
- Use case examples:
  - Physics & Engineering Analysis
  - Medical Reasoning
  - Economic Analysis
- Strategy evaluation metrics
- Performance monitoring capabilities

### Technical Details
- TypeScript implementation
- MCP server integration
- Local-first architecture
- Configurable parameters:
  - Beam width (1-10)
  - Simulation count (1-150)
  - Cache size
- Strategy-specific optimizations

### Documentation
- Technical documentation (docs.md)
- Contribution guidelines (CONTRIBUTING.md)
- Security policy (SECURITY.md)
- API documentation
- Use case examples

## [1.0.0] - 2024-12-31

### Added
- Beta release with core functionality (beam search & MCTS)
- Basic reasoning strategies
- Initial documentation

## [0.1.0] - 2024-12-19

### Added
- Basic MCP integration
