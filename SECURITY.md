# Security Policy

## Supported Versions
| Version | Supported |
| --- | --- |
| 0.1.x | ✅
| 0.0.x | ❌

## Reporting a Vulnerability
1. Email security reports to `security@enigma.dev`. Use the subject line `ENIGMA SECURITY REPORT`.
2. Include detailed reproduction steps, impact assessment, and proof-of-concept if available.
3. Encrypt sensitive attachments with our PGP key (`pgp.mit.edu`, fingerprint `E1F0 9F22 4E5C 1E4B 7995  4C19 6CD8 4D91 B7AD 9D45`).
4. We strive to acknowledge reports within **2 business days** and provide remediation ETAs within **7 business days**.

## Disclosure Process
- We follow a coordinated disclosure model. Public advisories are published only after a fix is available or 90 days have elapsed.
- Security fixes are highlighted in `CHANGELOG.md`, `RELEASE_NOTES.md`, and GitHub Security Advisories.

## Hardening Checklist
- Rotate API keys stored in the settings file regularly.
- Run the `sast.yml`, `dast.yml`, and `sca.yml` workflows on all protected branches.
- Enable GitHub secret scanning with push protection.
- Review Dependabot pull requests promptly.

Thank you for helping keep Enigma safe for everyone.
