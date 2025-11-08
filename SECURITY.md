# Security Policy

## Supported versions

We support the most recent minor release of Copliot Enigma. Security fixes are prioritised for:

| Version | Supported |
| ------- | --------- |
| main    | ✅        |

Older releases may receive fixes on a best-effort basis only.

## Reporting a vulnerability

Please email `security@copliot-enigma.dev` with the following details:

- A descriptive title and summary of the vulnerability
- Steps to reproduce, including logs, screenshots, and proof-of-concept scripts when available
- Impact assessment and potential mitigations if you have them

We will acknowledge receipt within **2 business days** and provide a triage status update within **5 business days**. Coordinated disclosure timelines are negotiated with reporters, but we aim to publish fixes within **30 days** of confirmation.

## Preferred languages

We can respond in English or Spanish.

## Security best practices for users

- Rotate API keys stored in the desktop client regularly; the settings surface encrypts keys at rest but assumes local filesystem security.
- Keep Chromium and ChromeDriver versions aligned with the pinned workflow inputs.
- Run the application from trusted networks and avoid using unverified OpenAI-compatible endpoints.

Thank you for helping us keep Copliot Enigma safe for everyone.
