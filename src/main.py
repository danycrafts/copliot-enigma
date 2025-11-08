import json
import time
from pathlib import Path
from typing import Dict, Iterable, List

import requests
import ttkbootstrap as ttk
from ttkbootstrap.constants import BOTH, EW, LEFT, NSEW, RIGHT, W
from ttkbootstrap.dialogs import Messagebox

import tkinter as tk

from driver.selenium import BrowserClient
from utils.helpers import calculate_max_browsers_or_tabs
from utils.logger import Logger
from utils.settings import SettingsStore


DATA_PATH = Path(__file__).resolve().parent / "data" / "elements.json"


class MaterialCard(ttk.Frame):
    """A simple Material-inspired card component for Tkinter."""

    def __init__(self, master, title: str, value: str, description: str = ""):
        super().__init__(master, padding=15, bootstyle="secondary")
        self.columnconfigure(0, weight=1)

        ttk.Label(self, text=title, bootstyle="secondary", font=("Inter", 10, "bold")).grid(row=0, column=0, sticky=W)

        self.value_label = ttk.Label(self, text=value, font=("Inter", 22, "bold"))
        self.value_label.grid(row=1, column=0, sticky=W, pady=(4, 0))

        if description:
            ttk.Label(self, text=description, bootstyle="secondary").grid(row=2, column=0, sticky=W, pady=(2, 0))

    def set_value(self, value: str) -> None:
        self.value_label.configure(text=value)


class CopliotEnigmaApp:
    def __init__(self) -> None:
        self.logger = Logger()
        self.client = BrowserClient()
        self.settings_store = SettingsStore()
        self.settings = self.settings_store.load()

        self.window = ttk.Window(themename="flatly")
        self.window.title("Copliot Enigma")
        self.window.geometry("1280x900")
        self.window.minsize(1024, 768)
        self.window.configure(padx=20, pady=20)

        self.window.protocol("WM_DELETE_WINDOW", self._on_close)

        self._configure_styles()
        self._build_layout()
        self._initialize_browser()

    # ------------------------------------------------------------------
    # Window + styling
    # ------------------------------------------------------------------
    def _configure_styles(self) -> None:
        style = ttk.Style()
        style.configure("MaterialHeading.TLabel", font=("Inter", 18, "bold"))
        style.configure("MaterialSubheading.TLabel", font=("Inter", 12))
        style.configure("MaterialCard.TFrame", relief="flat")

    def _build_layout(self) -> None:
        top_bar = ttk.Frame(self.window, padding=(10, 10), bootstyle="dark")
        top_bar.pack(fill=EW)

        ttk.Label(top_bar, text="Copliot Enigma", font=("Inter", 20, "bold"), bootstyle="inverse-dark").pack(side=LEFT)
        ttk.Label(
            top_bar,
            text="Desktop orchestration workspace",
            bootstyle="inverse-dark"
        ).pack(side=RIGHT)

        notebook = ttk.Notebook(self.window, bootstyle="flat")
        notebook.pack(fill=BOTH, expand=True, pady=(20, 0))

        self.dashboard_tab = ttk.Frame(notebook, padding=20)
        self.activity_tab = ttk.Frame(notebook, padding=20)
        self.settings_tab = ttk.Frame(notebook, padding=20)

        notebook.add(self.dashboard_tab, text="Dashboard")
        notebook.add(self.activity_tab, text="Activity Explorer")
        notebook.add(self.settings_tab, text="Settings")

        self._build_dashboard()
        self._build_activity_explorer()
        self._build_settings()

    # ------------------------------------------------------------------
    # Dashboard
    # ------------------------------------------------------------------
    def _build_dashboard(self) -> None:
        heading = ttk.Label(self.dashboard_tab, text="Operational dashboard", style="MaterialHeading.TLabel")
        heading.pack(anchor=W)

        subheading = ttk.Label(
            self.dashboard_tab,
            text="Monitor host capacity, concurrency limits, and browser health.",
            style="MaterialSubheading.TLabel",
            bootstyle="secondary"
        )
        subheading.pack(anchor=W, pady=(0, 20))

        card_container = ttk.Frame(self.dashboard_tab)
        card_container.pack(fill=EW)
        card_container.columnconfigure((0, 1, 2), weight=1, uniform="card")

        self.metrics_cards: Dict[str, MaterialCard] = {}
        for index, (key, label) in enumerate(
            [
                ("cpu_usage_percent", "CPU utilisation"),
                ("available_ram_gb", "Available RAM (GB)"),
                ("max_browsers", "Simultaneous browsers"),
            ]
        ):
            card = MaterialCard(card_container, title=label, value="–")
            card.grid(row=0, column=index, padx=10, sticky=NSEW)
            self.metrics_cards[key] = card

        self.system_table = ttk.Treeview(
            self.dashboard_tab,
            columns=("Property", "Value"),
            show="headings",
            height=6,
            bootstyle="dark"
        )
        self.system_table.heading("Property", text="Property")
        self.system_table.heading("Value", text="Value")
        self.system_table.column("Property", width=180, anchor=W)
        self.system_table.column("Value", anchor=W)
        self.system_table.pack(fill=BOTH, expand=True, pady=20)

        action_row = ttk.Frame(self.dashboard_tab)
        action_row.pack(fill=EW)

        ttk.Button(
            action_row,
            text="Refresh metrics",
            bootstyle="primary",
            command=self._refresh_metrics
        ).pack(side=LEFT)

        ttk.Button(
            action_row,
            text="Validate Chromium bundle",
            bootstyle="secondary-outline",
            command=self._validate_chromium
        ).pack(side=LEFT, padx=(10, 0))

        self._refresh_metrics()

    def _refresh_metrics(self) -> None:
        try:
            metrics = calculate_max_browsers_or_tabs("chrome")
            system_info = metrics.get("system_info", {})
        except Exception as exc:  # pragma: no cover - defensive UI guard
            self.logger.error(f"Unable to collect system metrics: {exc}")
            metrics = {"max_browsers": "–"}
            system_info = {}

        self._update_card("cpu_usage_percent", f"{system_info.get('cpu_usage_percent', 0):.1f}%")
        self._update_card("available_ram_gb", f"{system_info.get('available_ram_gb', 0):.2f}")
        self._update_card("max_browsers", str(metrics.get("max_browsers", "–")))

        for row in self.system_table.get_children():
            self.system_table.delete(row)

        for key, value in system_info.items():
            if key == "cpu_usage_percent":
                continue
            pretty_key = key.replace("_", " ").title()
            self.system_table.insert("", "end", values=(pretty_key, value))

    def _update_card(self, key: str, value: str) -> None:
        card = self.metrics_cards.get(key)
        if not card:
            return
        card.set_value(value)

    def _validate_chromium(self) -> None:
        try:
            self.client.visit("https://www.example.com")
            time.sleep(1)
            Messagebox.show_info("Chromium bundle validated", "Able to launch Chromium and load example.com", parent=self.window)
        except Exception as exc:  # pragma: no cover - runtime guard
            self.logger.error(f"Chromium validation failed: {exc}")
            Messagebox.show_error("Chromium bundle validation failed", str(exc), parent=self.window)

    # ------------------------------------------------------------------
    # Activity Explorer
    # ------------------------------------------------------------------
    def _build_activity_explorer(self) -> None:
        heading = ttk.Label(self.activity_tab, text="Activity explorer", style="MaterialHeading.TLabel")
        heading.pack(anchor=W)

        description = ttk.Label(
            self.activity_tab,
            text="Review deterministic automation events to refine scrapers and flows.",
            style="MaterialSubheading.TLabel",
            bootstyle="secondary"
        )
        description.pack(anchor=W, pady=(0, 16))

        filter_row = ttk.Frame(self.activity_tab)
        filter_row.pack(fill=EW, pady=(0, 10))
        ttk.Label(filter_row, text="Filter", bootstyle="secondary").pack(side=LEFT)
        self.activity_filter = tk.StringVar()
        ttk.Entry(filter_row, textvariable=self.activity_filter).pack(side=LEFT, padx=(10, 0), fill=EW, expand=True)
        ttk.Button(filter_row, text="Apply", command=self._apply_activity_filter, bootstyle="primary-outline").pack(side=LEFT, padx=10)

        columns = ("service", "screen", "action", "selector")
        self.activity_table = ttk.Treeview(
            self.activity_tab,
            columns=columns,
            show="headings",
            bootstyle="dark",
            height=12
        )
        headings = {
            "service": "Service",
            "screen": "Screen",
            "action": "Action",
            "selector": "Selector"
        }
        for column in columns:
            self.activity_table.heading(column, text=headings[column])
            self.activity_table.column(column, width=160, anchor=W)
        self.activity_table.pack(fill=BOTH, expand=True)

        self.activity_records = self._load_activity_data()
        self._render_activity_rows(self.activity_records)

    def _load_activity_data(self) -> List[Dict[str, str]]:
        if not DATA_PATH.exists():
            self.logger.warning(f"Activity dataset missing at {DATA_PATH}")
            return []

        data = json.loads(DATA_PATH.read_text())
        rows: List[Dict[str, str]] = []
        for service, screens in data.items():
            for screen, elements in screens.items():
                for element in elements:
                    rows.append(
                        {
                            "service": service.title(),
                            "screen": screen.replace("_", " ").title(),
                            "action": element.get("action", ""),
                            "selector": element.get("selector_value", ""),
                        }
                    )
        return rows

    def _apply_activity_filter(self) -> None:
        term = self.activity_filter.get().strip().lower()
        if not term:
            filtered = self.activity_records
        else:
            filtered = [
                row for row in self.activity_records
                if term in row["service"].lower()
                or term in row["screen"].lower()
                or term in row["action"].lower()
                or term in row["selector"].lower()
            ]
        self._render_activity_rows(filtered)

    def _render_activity_rows(self, rows: Iterable[Dict[str, str]]) -> None:
        for record in self.activity_table.get_children():
            self.activity_table.delete(record)
        for row in rows:
            self.activity_table.insert("", "end", values=(row["service"], row["screen"], row["action"], row["selector"]))

    # ------------------------------------------------------------------
    # Settings
    # ------------------------------------------------------------------
    def _build_settings(self) -> None:
        heading = ttk.Label(self.settings_tab, text="Settings", style="MaterialHeading.TLabel")
        heading.grid(row=0, column=0, sticky=W)

        description = ttk.Label(
            self.settings_tab,
            text="Configure OpenAI-compatible endpoints and secure credentials.",
            style="MaterialSubheading.TLabel",
            bootstyle="secondary"
        )
        description.grid(row=1, column=0, sticky=W, pady=(0, 20))

        form = ttk.Frame(self.settings_tab)
        form.grid(row=2, column=0, sticky=NSEW)
        form.columnconfigure(1, weight=1)

        ttk.Label(form, text="Base URL", bootstyle="secondary").grid(row=0, column=0, sticky=W, pady=5)
        self.api_base_var = tk.StringVar(value=self.settings.base_url)
        ttk.Entry(form, textvariable=self.api_base_var).grid(row=0, column=1, sticky=EW, pady=5)

        ttk.Label(form, text="API key", bootstyle="secondary").grid(row=1, column=0, sticky=W, pady=5)
        self.api_key_var = tk.StringVar(value=self.settings.api_key)
        ttk.Entry(form, textvariable=self.api_key_var, show="•").grid(row=1, column=1, sticky=EW, pady=5)

        ttk.Label(form, text="Model", bootstyle="secondary").grid(row=2, column=0, sticky=W, pady=5)
        self.model_var = tk.StringVar(value=self.settings.model or "gpt-4o-mini")
        ttk.Combobox(
            form,
            textvariable=self.model_var,
            values=["gpt-4o-mini", "gpt-4.1", "claude-3-haiku", "mistral-large"],
            state="readonly"
        ).grid(row=2, column=1, sticky=EW, pady=5)

        button_row = ttk.Frame(form)
        button_row.grid(row=3, column=0, columnspan=2, sticky=W, pady=(15, 0))
        ttk.Button(button_row, text="Test connection", bootstyle="primary", command=self._test_llm_connection).pack(side=LEFT)
        ttk.Button(button_row, text="Save", bootstyle="success", command=self._save_settings).pack(side=LEFT, padx=10)

    def _test_llm_connection(self) -> None:
        base_url = self.api_base_var.get().strip()
        api_key = self.api_key_var.get().strip()
        if not base_url:
            Messagebox.show_warning("Base URL missing", "Enter a base URL before testing the connection.", parent=self.window)
            return

        url = f"{base_url.rstrip('/')}/models"
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.ok:
                Messagebox.show_info("Endpoint reachable", "Successfully queried the /models endpoint.", parent=self.window)
            else:
                Messagebox.show_warning(
                    "Endpoint responded with an error",
                    f"Status {response.status_code}: {response.text[:200]}",
                    parent=self.window,
                )
        except requests.RequestException as exc:  # pragma: no cover - runtime guard
            self.logger.error(f"LLM connection test failed: {exc}")
            Messagebox.show_error("Unable to contact endpoint", str(exc), parent=self.window)

    def _save_settings(self) -> None:
        self.settings.base_url = self.api_base_var.get().strip()
        self.settings.api_key = self.api_key_var.get().strip()
        self.settings.model = self.model_var.get().strip()
        self.settings_store.save(self.settings)
        Messagebox.show_info("Settings saved", "Credentials stored locally.", parent=self.window)

    # ------------------------------------------------------------------
    # Selenium bootstrap
    # ------------------------------------------------------------------
    def _initialize_browser(self) -> None:
        try:
            self.client.initialize_driver()
            self.logger.info("Chromium driver ready")
        except Exception as exc:  # pragma: no cover - runtime guard
            self.logger.error(f"Unable to initialise browser: {exc}")
            Messagebox.show_warning(
                "Chromium unavailable",
                "Browser automation features may be limited until Chromium is available.",
                parent=self.window,
            )

    def _on_close(self) -> None:
        try:
            self.client.close_driver()
        except Exception:
            pass
        self.window.destroy()

    def run(self) -> None:
        self.window.mainloop()


def main() -> None:
    app = CopliotEnigmaApp()
    app.run()


if __name__ == "__main__":
    main()
