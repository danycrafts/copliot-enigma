# Contributing to Enigma Desktop Copilot

Thank you for your interest in contributing! The project thrives when the community collaborates. This guide explains how to propose changes, report bugs, and build features responsibly.

## 🧭 Code of Conduct
Participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before engaging in project spaces.

## 🗂 Project Structure
- `main.go`, `app.go`, `internal/*`: Go backend powering the desktop runtime.
- `frontend/`: Preact + Material UI user interface.
- `.github/`: CI/CD and security automation.
- `docs/` *(future)*: Reserved for extended documentation.

## 🛠 Development Workflow
1. **Fork & branch** — Create a feature branch from `main`. Use the format `feature/description` or `fix/short-description`.
2. **Run linters/tests**:
   - `go test ./...`
   - `npm run lint --prefix frontend`
3. **Document** — Update README, CHANGELOG, or ROADMAP as needed.
4. **Commit** — Use conventional commit prefixes (e.g., `feat:`, `fix:`, `docs:`) and keep messages under 72 characters.
5. **Pull Request** — Reference related Jira-style backlog items when applicable and describe testing evidence. PRs must pass all GitHub workflow checks.

## ✅ Review Checklist
- [ ] Code paths are covered by tests or include rationale for lacking tests.
- [ ] User-facing copy is localized via i18next keys.
- [ ] New APIs include backend and frontend contracts (update `wailsjs` bindings when you add Go methods).
- [ ] Security implications are documented (especially around settings persistence and API keys).

## 🐞 Reporting Issues
- Use the GitHub issue template.
- Include reproduction steps, expected vs. actual behavior, environment details, and screenshots when relevant.
- Tag issues with `bug`, `enhancement`, or `security` to streamline triage.

## 🔐 Security Vulnerabilities
Report security concerns privately following the guidance in [SECURITY.md](SECURITY.md). Avoid filing public issues that describe exploit details.

## 🤝 Triaging & Governance
The core maintainers listed in [GOVERNANCE.md](GOVERNANCE.md) review contributions weekly. Community maintainers can self-assign issues once they have two approved PRs.

## 📦 Release Process
1. Update `CHANGELOG.md` and `RELEASE_NOTES.md`.
2. Bump version tags as appropriate.
3. Create a GitHub release; the `release.yml` workflow will build and publish packages to GitHub Packages.

We appreciate your time and expertise—welcome aboard!
