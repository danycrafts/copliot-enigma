"""Utility helpers for system diagnostics and URL handling."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Dict, Optional

import platform
import re
import subprocess
import time
import urllib.parse

import psutil

DEFAULT_MEMORY_USAGE_MB = 350.0


@dataclass(frozen=True)
class SystemInfo:
    """Represents relevant system metrics for capacity calculations."""

    architecture: str
    num_cores: int
    available_ram_gb: float
    total_ram_gb: float
    cpu_usage_percent: float
    os: str
    os_version: str

    def to_dict(self) -> Dict[str, float | str | int]:
        return asdict(self)


@dataclass(frozen=True)
class BrowserCapacity:
    """Describes how many browser instances the system can sustain."""

    max_browsers_by_ram: int
    max_browsers_by_cpu: int
    max_browsers: int
    system_info: SystemInfo
    avg_memory_per_browser_mb: float

    def to_dict(self) -> Dict[str, object]:
        payload = asdict(self)
        payload["system_info"] = self.system_info.to_dict()
        return payload


def get_system_info() -> SystemInfo:
    """Gather key system information such as architecture, CPU cores, and RAM."""

    os_name = platform.system().lower()
    os_mapping = {
        "windows": ("Windows", platform.version()),
        "darwin": ("macOS", platform.mac_ver()[0]),
        "linux": ("Linux", platform.release()),
    }
    resolved_os, resolved_version = os_mapping.get(os_name, ("Unknown", "Unknown"))

    memory = psutil.virtual_memory()
    return SystemInfo(
        architecture=platform.machine(),
        num_cores=psutil.cpu_count(logical=True) or 1,
        available_ram_gb=memory.available / (1024 ** 3),
        total_ram_gb=memory.total / (1024 ** 3),
        cpu_usage_percent=psutil.cpu_percent(interval=1),
        os=resolved_os,
        os_version=resolved_version,
    )


def calculate_max_browsers_or_tabs(browser: str = "chrome") -> BrowserCapacity:
    """Estimate the maximum number of browser instances/tabs the system can support."""

    system_info = get_system_info()
    avg_memory_per_browser = get_browser_memory_usage(browser)

    max_by_ram = int(system_info.available_ram_gb * 1024 / avg_memory_per_browser * 0.8)
    max_by_cpu = system_info.num_cores
    max_browsers = max(1, min(max_by_ram, max_by_cpu))

    return BrowserCapacity(
        max_browsers_by_ram=max_by_ram,
        max_browsers_by_cpu=max_by_cpu,
        max_browsers=max_browsers,
        system_info=system_info,
        avg_memory_per_browser_mb=avg_memory_per_browser,
    )


def get_browser_memory_usage(browser: str = "chrome") -> float:
    """Estimate the average memory consumption per browser instance/tab."""

    browser = browser.lower()
    commands = {
        "chrome": (["google-chrome", "--headless", "--disable-gpu"], "chrome"),
        "firefox": (["firefox", "--headless"], "firefox"),
    }

    if browser not in commands:
        raise ValueError("Unsupported browser: Only 'chrome' and 'firefox' are supported.")

    command, process_name = commands[browser]
    return _estimate_memory_usage(command, process_name)


def _estimate_memory_usage(command: list[str], process_name: str) -> float:
    """Launch a browser process to measure its memory usage."""

    process: Optional[subprocess.Popen] = None
    try:
        process = subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except FileNotFoundError:
        return DEFAULT_MEMORY_USAGE_MB

    try:
        time.sleep(5)
        memory_usage = 0.0
        for proc in psutil.process_iter(["pid", "name", "memory_info"]):
            try:
                if process_name in (proc.info.get("name") or "").lower():
                    memory_usage += proc.info["memory_info"].rss / (1024 ** 2)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return memory_usage or DEFAULT_MEMORY_USAGE_MB
    finally:
        if process:
            process.terminate()
            process.wait(timeout=5)


def transform_url(url: str) -> str:
    """Transform a URL into a filesystem-friendly identifier."""

    if not url:
        raise ValueError("URL cannot be empty")
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc or parsed.path
    if not domain:
        raise ValueError("Invalid URL provided")
    return domain.replace(".", "_")


def get_cached_url(url: str) -> str:
    return f"https://webcache.googleusercontent.com/search?q=cache:{url}"


def get_snapshot_date(body_html: str) -> str:
    match = re.search(r"\d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT", body_html)
    if not match:
        raise ValueError("Snapshot date not found in HTML body")
    return match.group(0)
