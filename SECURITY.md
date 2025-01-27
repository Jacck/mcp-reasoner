# Security Policy and Privacy Notice

## Overview

MCP-reasoner is a local-first reasoning engine that adds advanced reasoning capabilities to language models and clients that support tool use and MCP integration. This document outlines our security policy and privacy commitments.

## Privacy Policy

### Data Collection

- MCP-reasoner **does not collect any data**
- No analytics or telemetry
- No API keys required
- No cloud services or external connections
- All processing happens locally on your device

### Local Operation

- MCP-reasoner runs entirely on your local machine
- No data is sent to external servers
- All thought processing and state management occurs locally
- Cache and temporary data are stored only in local memory

### Integration Privacy

When using MCP-reasoner with language models or clients:
- No data is shared beyond the immediate tool interface
- Reasoning processes remain isolated to your local environment
- No persistent storage of thought chains or reasoning paths
- Memory cache is cleared upon server shutdown

## Security Considerations

### Local Execution Security

1. **Process Isolation**
   - Runs as a standalone process
   - No elevated privileges required
   - Isolated memory space
   - No filesystem modifications outside working directory

2. **Resource Management**
   - Configurable memory limits
   - Automatic cache cleanup
   - No persistent storage
   - Controlled resource allocation

### Integration Security

1. **MCP Protocol**
   - Secure local communication via stdio
   - No network ports opened
   - Structured data validation
   - Type-safe interfaces

2. **Client Integration**
   - Sandboxed execution
   - Limited scope of operations
   - Input validation and sanitization
   - Error boundary containment

## Best Practices

### Secure Usage

1. **Version Control**
   - Keep MCP-reasoner updated to latest version
   - Monitor security advisories
   - Review changelog for security-related updates

2. **Integration**
   - Use official MCP integration methods
   - Validate client configurations
   - Follow security guidelines of host applications

### Data Handling

1. **Sensitive Information**
   - Avoid passing sensitive data through reasoning chains
   - Clear cache after processing sensitive thoughts
   - Use appropriate access controls in host applications

2. **Local Environment**
   - Maintain secure host environment
   - Apply system-level security patches
   - Follow OS security best practices

## Security Updates

While MCP-reasoner is designed to be secure by default through its local-first, no-data-collection approach, we still maintain security as a priority:

1. **Vulnerability Reporting**
   - Report security concerns via GitHub issues
   - Use "Security" label for security-related issues
   - Provide detailed reproduction steps

2. **Update Policy**
   - Security patches prioritized
   - Backward compatibility maintained where possible
   - Clear documentation of security-related changes

## Compliance

MCP-reasoner's local-first, no-data-collection design inherently supports compliance with various privacy regulations:

- GDPR - No personal data collection or processing
- CCPA - No data sharing or sales
- HIPAA - No health information storage or transmission
- FERPA - No educational records handling

## Contact

For security concerns or privacy questions:
1. Open a GitHub issue with the "Security" label
2. Provide detailed information about your concern
3. Allow reasonable time for response and resolution

## Disclaimer

MCP-reasoner is provided "as is" without warranty of any kind. While we strive to maintain security best practices, users are responsible for:

1. Securing their local environment
2. Managing sensitive data appropriately
3. Following security best practices
4. Keeping the software updated
5. Implementing appropriate access controls

## Changes to This Policy

Any changes to this security policy will be:
1. Documented in CHANGELOG.md
2. Tagged with appropriate version
3. Highlighted in release notes
4. Communicated through GitHub releases
