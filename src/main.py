"""Entry point for the ScrapeGoat desktop application."""
from __future__ import annotations

import tkinter as tk
from dataclasses import dataclass, field
from typing import List
from urllib.parse import urlparse, urlunparse

import ttkbootstrap as ttk
from tkinter import messagebox

from driver.selenium import BrowserClient
from utils.diagnostics import DiagnosticsService
from utils.logger import Logger


@dataclass
class ActivityHistory:
    """Keeps the browsing history displayed in the activity screen."""

    items: List[str] = field(default_factory=list)
    max_items: int = 10

    def add(self, url: str) -> None:
        if url in self.items:
            self.items.remove(url)
        self.items.insert(0, url)
        del self.items[self.max_items :]


class ScrapeGoatApp:
    """Main application controller coordinating UI and browser automation."""

    def __init__(self) -> None:
        self.logger = Logger(log_file="app.log")
        self.browser_client = BrowserClient()
        self.diagnostics_service = DiagnosticsService(self.browser_client)

        self.root = tk.Tk()
        self.root.title("ScrapeGoat Browser")
        self.root.geometry("1260x915")
        self.root.resizable(False, False)

        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(expand=True, fill="both", padx=10, pady=10)

        self.activity_screen = ActivityScreen(
            master=self.notebook,
            browser_client=self.browser_client,
            logger=self.logger,
        )
        self.settings_screen = SettingsScreen(
            master=self.notebook,
            diagnostics_service=self.diagnostics_service,
            logger=self.logger,
        )

        self.notebook.add(self.activity_screen, text="Activity")
        self.notebook.add(self.settings_screen, text="Settings")

        self.root.protocol("WM_DELETE_WINDOW", self._shutdown)
        self.root.after(0, self._initialise_browser)

    def _initialise_browser(self) -> None:
        try:
            self.browser_client.ensure_driver()
            self.settings_screen.refresh()
        except Exception as error:  # pylint: disable=broad-except
            self.logger.error(f"Failed to initialise browser: {error}")
            messagebox.showerror(
                "Initialisation error",
                "The embedded browser could not be initialised. Please check the logs.",
            )

    def _shutdown(self) -> None:
        self.browser_client.close_driver()
        self.root.destroy()

    def run(self) -> None:
        self.root.mainloop()


class ActivityScreen(ttk.Frame):
    """Activity screen where users can launch the embedded browser."""

    def __init__(self, master, browser_client: BrowserClient, logger: Logger):
        super().__init__(master)
        self.browser_client = browser_client
        self.logger = logger
        self.history = ActivityHistory()

        self.url_var = tk.StringVar()
        self.status_var = tk.StringVar(
            value="Paste a URL and click 'Open in Browser' to start browsing."
        )

        self._build_ui()

    def _build_ui(self) -> None:
        ttk.Label(self, text="Open a web page", font=("TkDefaultFont", 12, "bold")).pack(
            anchor="w", padx=10, pady=(10, 5)
        )

        entry_frame = ttk.Frame(self)
        entry_frame.pack(fill="x", padx=10)

        entry = ttk.Entry(entry_frame, textvariable=self.url_var)
        entry.pack(side="left", fill="x", expand=True)
        entry.focus()

        ttk.Button(entry_frame, text="Open in Browser", command=self._on_open).pack(
            side="left", padx=(10, 0)
        )
        ttk.Button(entry_frame, text="Clear", command=self._clear_input).pack(side="left", padx=5)

        ttk.Label(self, textvariable=self.status_var, wraplength=800).pack(
            anchor="w", padx=10, pady=(10, 0)
        )

        ttk.Separator(self, orient="horizontal").pack(fill="x", padx=10, pady=15)

        ttk.Label(self, text="Recent activity", font=("TkDefaultFont", 11, "bold")).pack(
            anchor="w", padx=10
        )

        self.history_list = tk.Listbox(self, height=8)
        self.history_list.pack(fill="x", padx=10, pady=(5, 10))
        self.history_list.bind("<Double-1>", lambda _: self._on_history_select())

    def _clear_input(self) -> None:
        self.url_var.set("")

    def _on_history_select(self) -> None:
        selection = self.history_list.curselection()
        if not selection:
            return
        url = self.history_list.get(selection[0])
        self.url_var.set(url)
        self._open_url(url)

    def _on_open(self) -> None:
        url = self.url_var.get().strip()
        if not url:
            messagebox.showwarning("Missing URL", "Please provide a URL to open.")
            return

        try:
            normalised_url = self._normalise_url(url)
        except ValueError as error:
            messagebox.showerror("Invalid URL", str(error))
            return

        self._open_url(normalised_url)

    def _open_url(self, url: str) -> None:
        try:
            self.browser_client.open_url(url)
        except Exception as error:  # pylint: disable=broad-except
            self.logger.error(f"Failed to open {url}: {error}")
            messagebox.showerror(
                "Browser error",
                f"The application could not open {url}. Please check the logs.",
            )
            self.status_var.set(f"Failed to open {url}")
            return

        self.history.add(url)
        self._refresh_history()
        self.status_var.set(f"Opened {url}")
        self.logger.info(f"Opened URL: {url}")

    def _refresh_history(self) -> None:
        self.history_list.delete(0, tk.END)
        for item in self.history.items:
            self.history_list.insert(tk.END, item)

    @staticmethod
    def _normalise_url(url: str) -> str:
        parsed = urlparse(url if "://" in url else f"https://{url}")
        if not parsed.netloc:
            raise ValueError("The provided text is not a valid URL.")
        return urlunparse(parsed)


class SettingsScreen(ttk.Frame):
    """Settings screen displaying diagnostics and environment information."""

    def __init__(self, master, diagnostics_service: DiagnosticsService, logger: Logger):
        super().__init__(master)
        self._diagnostics_service = diagnostics_service
        self.logger = logger

        self.system_tree = ttk.Treeview(self, columns=("Property", "Value"), show="headings", height=6)
        self.system_tree.heading("Property", text="Property")
        self.system_tree.heading("Value", text="Value")
        self.system_tree.column("Property", width=240, anchor="w")
        self.system_tree.column("Value", width=460, anchor="w")

        self.capacity_tree = ttk.Treeview(self, columns=("Metric", "Value"), show="headings", height=5)
        self.capacity_tree.heading("Metric", text="Metric")
        self.capacity_tree.heading("Value", text="Value")
        self.capacity_tree.column("Metric", width=240, anchor="w")
        self.capacity_tree.column("Value", width=460, anchor="w")

        self._build_ui()

    def _build_ui(self) -> None:
        ttk.Label(self, text="Diagnostics", font=("TkDefaultFont", 12, "bold")).pack(
            anchor="w", padx=10, pady=(10, 5)
        )
        self.system_tree.pack(fill="x", padx=10)

        ttk.Label(self, text="Capacity Estimates", font=("TkDefaultFont", 11, "bold")).pack(
            anchor="w", padx=10, pady=(15, 5)
        )
        self.capacity_tree.pack(fill="x", padx=10)

        ttk.Button(self, text="Refresh diagnostics", command=self.refresh).pack(
            anchor="e", padx=10, pady=15
        )

        self.binary_info = tk.Text(self, height=6, state="disabled", wrap="word")
        self.binary_info.pack(fill="both", expand=True, padx=10, pady=(0, 10))

    def refresh(self) -> None:
        try:
            report = self._diagnostics_service.collect()
        except Exception as error:  # pylint: disable=broad-except
            self.logger.error(f"Failed to collect diagnostics: {error}")
            messagebox.showerror("Diagnostics error", "Unable to collect diagnostics.")
            return

        self._populate_tree(self.system_tree, report.system_info_rows())
        self._populate_tree(self.capacity_tree, report.capacity_rows())
        self._populate_binary_info(report)

    def _populate_tree(self, tree: ttk.Treeview, rows: List[tuple[str, str]]) -> None:
        for item in tree.get_children():
            tree.delete(item)
        for key, value in rows:
            tree.insert("", "end", values=(key, value))

    def _populate_binary_info(self, report) -> None:
        self.binary_info.configure(state="normal")
        self.binary_info.delete("1.0", tk.END)
        for key, value in report.binary_rows():
            self.binary_info.insert(tk.END, f"{key}: {value}\n")
        self.binary_info.configure(state="disabled")


def main() -> None:
    app = ScrapeGoatApp()
    app.run()


if __name__ == "__main__":
    main()
