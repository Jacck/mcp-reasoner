# Support

This document outlines how to get help with MCP Reasoner.

## Quick Start

1. **Installation**
   ```bash
   git clone https://github.com/Jacck/mcp-reasoner.git
   cd mcp-reasoner
   npm install
   npm run build
   ```

2. **Basic Usage**
   ```json
   {
    "McpServers": {
        "mcp-reasoner": {
            "command": "node",
            "args": ["path/to/dist/index.js"],
            "env": {}
        }
    }
   }
   ```

3. **MCP Integration**
   - Add to your MCP settings configuration file
    - Either `claude_desktop_config.json` or `cline_mcp_settings.json`
   - Configure environment variables if needed
   - Test connection with basic thought processing

## Getting Help

### Documentation Resources

1. [Technical Documentation](docs.md)
   - Architecture overview
   - API reference
   - Strategy guides
   - Configuration options

2. [Use Cases](Use%20Cases/)
   - Physics & Engineering examples
   - Medical reasoning patterns
   - Economic analysis samples

3. [Changelog](CHANGELOG.md)
   - Version history
   - Feature updates
   - Breaking changes

### Common Issues

#### Strategy Selection
- Review strategy comparison in docs
- Match strategy to use case
- Consider computational requirements

#### Performance Optimization
- Adjust cache size
- Configure simulation count
- Fine-tune beam width

#### Integration Troubleshooting
- Verify MCP server status
- Check configuration settings
- Validate tool registration

## Community Support

### GitHub Issues

1. Before Creating an Issue:
   - Search existing issues
   - Check documentation
   - Review use cases

2. Creating an Issue:
   - Use issue templates
   - Provide reproduction steps
   - Include relevant logs

### Contributing

Want to help improve MCP Reasoner?

1. Read our [Contributing Guide](CONTRIBUTING.md)
2. Follow our [Code of Conduct](CODE_OF_CONDUCT.md)
3. Submit improvements via Pull Requests

## Security Concerns

For security-related issues:

1. Review our [Security Policy](SECURITY.md)
2. Report vulnerabilities appropriately
3. Follow security best practices

## Stay Updated

- Watch the repository for updates
- Monitor the changelog
- Follow security advisories

## Contact

- Create GitHub issues for bugs/features
- Use discussions for questions
- Tag maintainers when needed

## Additional Resources

1. **Development**
   - TypeScript documentation
   - MCP protocol specification
   - Testing guidelines

2. **Best Practices**
   - Strategy selection guide
   - Performance optimization tips
   - Integration patterns

3. **Troubleshooting**
   - Common error solutions
   - Configuration checklist
   - Debug procedures

Remember: MCP Reasoner is a local-first tool that runs entirely on your machine. No data is collected, no API keys are required, and all processing happens locally.
