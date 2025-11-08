# Copliot Enigma

Copliot Enigma observes the rhythm of your desktop and turns those signals into actionable intelligence with a configurable OpenAI-compatible bridge. The project pairs a Wails-powered Go backend with a Material-inspired Tkinter workspace that delivers three cohesive screens: an operational dashboard, an activity explorer, and a settings surface that can connect to any OpenAI-compatible `/models` endpoint.

## Highlights

- **Material-first desktop workspace** – Responsive navigation, card-based metrics, and dark-mode aware theming powered by `ttkbootstrap` for a modern Material UI feel in native Tkinter.
- **Configurable LLM bridge** – Persist encrypted credentials locally, validate OpenAI-compatible endpoints, and surface latency + availability telemetry for the selected model.
- **Activity intelligence prototypes** – Deterministic sample data feeds inform dashboard charts and the explorer table to accelerate UX iteration.
- **Cross-platform packaging** – PyInstaller specifications plus GitHub Actions workflows bundle macOS, Windows, and Linux artifacts while pulling the exact Chromium + ChromeDriver pair required by Selenium.

## Prerequisites

- Python 3.10+
- Google Chromium 129.0.6668.58-1.1 portable bundle
- ChromeDriver 131.0.6724.0
- `pipenv` for environment management

All Python dependencies are captured in the `Pipfile`/`Pipfile.lock` pair and resolved automatically by Pipenv.

## Quick start

```bash
pipenv install --dev
pipenv run python src/main.py
```

The application launches into a three-tab Material-style interface:

1. **Dashboard** – Displays hardware telemetry, browser concurrency estimates, and live Chrome validation controls.
2. **Activity Explorer** – Filters deterministic telemetry events and renders them in a sortable tree view.
3. **Settings** – Stores LLM endpoints + credentials locally and validates connectivity on demand.

## Containerised development

Build the desktop-ready development container with Docker:

```bash
# grant X11 access on Linux hosts when forwarding GUI windows
xhost +

# build and run the container defined in `Containerfile`
docker build -t copliot-enigma . -f Containerfile
docker run --rm -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  copliot-enigma:latest
```

## Contributing

We welcome issues, feature ideas, and pull requests. Review our [Contributing Guide](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md) before submitting changes. For strategic planning, see the [Roadmap](./ROADMAP.md) and [Governance](./GOVERNANCE.md) documents.

## Security

Coordinated disclosure details live in [SECURITY.md](./SECURITY.md). Please report vulnerabilities privately to `security@copliot-enigma.dev`.

## Support

Need help? Consult the [Support guide](./SUPPORT.md) for triage expectations, response times, and escalation paths. Public questions belong on [GitHub Issues](https://github.com/danycrafts/copliot-enigma/issues).

---

Copliot Enigma is released under the [MIT License](./LICENSE).
