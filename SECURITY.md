# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security issues seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@bridge-codes.io**

Include the following information in your report:

- Type of issue (e.g., arbitrary code execution, path traversal, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours.
- **Communication**: We will keep you informed of our progress towards resolving the issue.
- **Timeline**: We aim to resolve critical vulnerabilities within 7 days, and other issues within 30 days.
- **Credit**: We will credit you in the security advisory and release notes (unless you prefer to remain anonymous).

### Safe Harbor

We consider security research and vulnerability disclosure activities conducted consistent with this policy to be:

- Authorized in accordance with any anti-hacking laws
- Exempt from restrictions in our Terms of Service that would interfere with conducting security research

We will not pursue legal action against researchers who:

- Engage in testing of systems/research without harming Bridge or its users
- Perform testing within the scope of this policy
- Report vulnerabilities in accordance with this policy

## Security Considerations

### Plugin System

Bridge supports a plugin system that allows custom code generators. When using third-party plugins:

- Only use plugins from trusted sources
- Review plugin code before use
- Be aware that plugins can execute arbitrary code during the generation process

### Configuration Files

Bridge configuration files (`bridge.config.ts`) are executed as JavaScript/TypeScript code. This means:

- Configuration files have full access to the Node.js runtime
- Only use configuration files from trusted sources
- Review configuration files before running `bridge generate`

### Generated Code

Bridge generates TypeScript code based on input specifications. While we strive to generate secure code:

- Always review generated code before using in production
- The security of generated HTTP clients depends on proper usage
- Validate and sanitize data at your application boundaries

## Security Features

Bridge includes several security-focused features:

- **No eval()**: We do not use `eval()` or `new Function()` in the code generator
- **Dependency Auditing**: We use GitHub's Dependabot for automated security updates
- **CodeQL Analysis**: Static analysis runs on every pull request
- **SBOM Generation**: Software Bill of Materials is generated for each release
- **Build Provenance**: Release artifacts include cryptographic provenance attestation

## Past Security Advisories

No security advisories have been published yet.
