# Contributing to MCP Reasoner

Thank you for your interest in contributing to MCP Reasoner! This document outlines the process and guidelines for contributing to this project.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your changes
4. Make your changes
5. Test your changes locally
6. Push to your fork
7. Create a Pull Request

## Pull Request Guidelines

### PR Title Format

All PR titles must be prefixed with either `minor:` or `major:` to indicate the scope of changes:

- `minor:` - Small changes, bug fixes, documentation updates, etc.
  - Example: `minor: edited the readme to handle new implementations`
  - Example: `minor: fixed type error in MCTS strategy`

- `major:` - Significant changes, new features, breaking changes, etc.
  - Example: `major: added new experimental MCTS variant`
  - Example: `major: refactored state management system`

### PR Description Template

Your PR description must include the following sections:

```markdown
## Changes Made
- Detailed list of changes
- Include rationale where relevant
- Reference related issues

## Changes Retracted (if applicable)
- List any code/features removed
- Explain why they were removed

## Local Testing
- [ ] I have tested these changes locally
- Describe the testing performed:
  - Tests run
  - Scenarios tested
  - Edge cases considered

## Additional Information
- Any other relevant details
- Performance implications
- Migration notes (if breaking changes)
```

## Development Guidelines

### Code Style

1. Use TypeScript for all new code
2. Follow best practices for code organization
3. Maintain consistent naming conventions:
   - PascalCase for classes and interfaces
   - camelCase for methods and variables
   - ALL_CAPS for constants

### Testing Requirements

1. All new features must include tests
2. All bug fixes must include regression tests
3. Run the full test suite before submitting PR
4. For reasoning strategies:
   - Include performance benchmarks
   - Test with various input sizes
   - Document edge cases

### Documentation

1. Update [docs.md](docs.md) for any user-facing changes
2. Include TSDoc comments for all public APIs
3. Update relevant use case examples
4. For new strategies:
   - Add detailed implementation notes
   - Include usage examples
   - Document performance characteristics

### Strategy Implementation Guidelines

When implementing new reasoning strategies:

1. Extend BaseStrategy class
2. Implement required interfaces
3. Include performance metrics
4. Document theoretical background
5. Provide comparison with existing strategies
6. Include use case examples

### Performance Considerations

1. Profile code changes for performance impact
2. Document memory usage characteristics
3. Consider scaling implications
4. Test with large datasets where relevant

### Breaking Changes

If your changes are breaking:

1. Prefix PR title with `major:`
2. Document migration path
3. Update all affected documentation
4. Provide code examples for migration
5. Consider backward compatibility options

## Review Process

1. All PRs require at least one reviewer
2. For major changes:
   - Require additional review
   - Include performance impact analysis
   - May require multiple iterations

## Commit Guidelines

1. Use clear, descriptive commit messages
2. Reference issues where applicable
3. Keep commits focused and atomic
4. Squash related commits before merging

## Issue Guidelines

When creating issues:

1. Use provided templates if available
2. Include reproduction steps for bugs
3. Provide example code where possible
4. Tag appropriately (bug, enhancement, etc.)

## Questions?

If you have questions about contributing:

1. Check existing documentation
2. Review closed PRs for examples
3. Open a discussion issue
4. Tag maintainers for clarification

## License

By contributing, you agree that your contributions will be licensed under the project's license.
