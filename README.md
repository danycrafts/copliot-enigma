# Enigma Desktop Copilot

Enigma observes the rhythm of your desktop and pairs those insights with a configurable OpenAI-compatible large language model. This repository contains a Wails-powered Go backend and a Preact + Material UI frontend that together deliver a three-screen experience: an operational dashboard, an activity explorer, and a rich settings surface that can reach any OpenAI-compatible API endpoint.

## ✨ Highlights
- **Material UI workspace** with responsive navigation, dark theme, and i18n-ready copy.
- **Configurable LLM bridge** that persists secure settings locally and validates connectivity against any OpenAI-compatible `/models` endpoint.
- **Activity intelligence prototypes** seeded from deterministic backend data to unlock rapid UX iteration.
- **Comprehensive open-source docs** (contributing, security, governance, roadmap, support) and GitHub automation for builds, releases, and security scanning.

## 🏗 Architecture Overview
| Layer | Key Tech | Responsibilities |
| --- | --- | --- |
| Desktop shell | [Wails](https://wails.io/) | Launches the Go backend, serves the compiled frontend, manages lifecycle hooks. |
| Backend | Go 1.23 | Settings persistence, OpenAI-compatible connectivity checks, sample activity feeds. |
| Frontend | Preact + Vite + Material UI | Multi-screen UX, localization via i18next, client-side routing, Wails bridge integration. |

## 🚀 Getting Started

### Prerequisites
- Go 1.23+
- Node.js 20+ and npm 10+
- Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

### Install dependencies
```bash
npm install --prefix frontend
```
> **Note:** The sandboxed environment used for automated tests may block access to npm mirrors. If installation fails with a `403 Forbidden`, retry from an environment with full registry access.

Before executing Go commands such as `go test`, build the frontend once so that the embedded assets exist:

```bash
npm run build --prefix frontend
```

### Run in development
```bash
wails dev
```
This command starts the Go backend and the Vite dev server with hot reloading.

### Build for production
```bash
wails build
```
The bundled desktop app will appear under `build/bin`.

## ✅ Quality Gates
- `go test ./...` — backend unit tests & lint-like safety net.
- `npm run lint --prefix frontend` — type-checks and quick static analysis.
- GitHub Actions (see `.github/workflows`) orchestrate build, security (SAST, DAST, SCA), and package publishing.

## 🛡 Security Automation Guide

### Enable GitHub code scanning with CodeQL
1. Navigate to **Security → Code security and analysis** in your repository settings.
2. Under **Code scanning**, click **Set up** then choose **CodeQL**.
3. Select **Default** configuration to monitor the `sast.yml` workflow that ships with this repo.
4. Merge the generated PR (if GitHub creates one) to activate scheduled and on-push scans.

### Enable secret scanning
1. In **Security → Code security and analysis**, toggle **Secret scanning** to **Enable all**.
2. If available, also enable **Push protection** to block sensitive commits before they land.

### Dependency and deployment safety
- **Dependabot** keeps Go modules, npm packages, and GitHub Actions fresh (`.github/dependabot.yml`).
- **SCA workflow (`sca.yml`)** executes Anchore-based dependency audits on every push to default branches.
- **DAST workflow (`dast.yml`)** runs OWASP ZAP baseline scans against preview deployments when applicable.

## 📦 Release & Packaging
- `build-test.yml` orchestrates Go and frontend builds/tests.
- `release.yml` packages artifacts and publishes a container image to GitHub Packages on tag pushes.
- Release announcements originate from `RELEASE_NOTES.md` and `CHANGELOG.md`.

## 🔭 What’s Next? (Jira-style backlog)
:::jira-ticket
Key: ENIGMA-201
Summary: Implement real-time desktop event ingestion service
Status: Todo
Notes: Wire native OS hooks into the Go backend and stream enriched events to the dashboard.
:::

:::jira-ticket
Key: ENIGMA-202
Summary: Add on-device summarization pipelines
Status: Todo
Notes: Introduce worker queues for batching LLM prompts and caching generated insights.
:::

:::jira-ticket
Key: ENIGMA-203
Summary: Harden secrets storage for API keys
Status: Todo
Notes: Integrate OS-specific secret vaults (Keychain, Credential Manager, libsecret) and migrate existing settings.
:::

## 🤝 Community & Governance
- [CONTRIBUTING](CONTRIBUTING.md)
- [CODE OF CONDUCT](CODE_OF_CONDUCT.md)
- [SECURITY](SECURITY.md)
- [SUPPORT](SUPPORT.md)
- [GOVERNANCE](GOVERNANCE.md)
- [ROADMAP](ROADMAP.md)
- [CHANGELOG](CHANGELOG.md)
- [RELEASE NOTES](RELEASE_NOTES.md)

## 📚 Additional Resources
- Material UI: https://mui.com/
- Preact: https://preactjs.com/
- Wails docs: https://wails.io/
