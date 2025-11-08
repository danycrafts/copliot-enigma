"""Diagnostics helpers for the desktop application."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Dict, List

from driver.selenium import BrowserClient
from utils.helpers import BrowserCapacity, calculate_max_browsers_or_tabs


@dataclass(frozen=True)
class BinaryDiagnostic:
    """Represents information about a packaged browser binary."""

    name: str
    path: str
    version: str

    def to_dict(self) -> Dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class DiagnosticsReport:
    """Aggregated diagnostic data for the settings screen."""

    capacity: BrowserCapacity
    binaries: List[BinaryDiagnostic]

    def system_info_rows(self) -> List[tuple[str, str]]:
        info = self.capacity.system_info.to_dict()
        return [(key.replace("_", " ").title(), str(value)) for key, value in info.items()]

    def capacity_rows(self) -> List[tuple[str, str]]:
        return [
            ("Max browsers (RAM)", str(self.capacity.max_browsers_by_ram)),
            ("Max browsers (CPU)", str(self.capacity.max_browsers_by_cpu)),
            ("Max browsers (overall)", str(self.capacity.max_browsers)),
            (
                "Estimated memory per browser (MB)",
                f"{self.capacity.avg_memory_per_browser_mb:.2f}",
            ),
        ]

    def binary_rows(self) -> List[tuple[str, str]]:
        rows: List[tuple[str, str]] = []
        for binary in self.binaries:
            rows.append((f"{binary.name} path", binary.path))
            rows.append((f"{binary.name} version", binary.version))
        return rows


class DiagnosticsService:
    """Collects diagnostics information to feed the UI."""

    def __init__(self, client: BrowserClient):
        self._client = client

    def collect(self) -> DiagnosticsReport:
        capacity = calculate_max_browsers_or_tabs()
        binaries: List[BinaryDiagnostic] = []
        try:
            environment = self._client.describe_environment()
            binaries.append(
                BinaryDiagnostic(
                    name="Ungoogled Chromium",
                    path=environment.binary_paths.browser_executable,
                    version=environment.browser_version,
                )
            )
            binaries.append(
                BinaryDiagnostic(
                    name="ChromeDriver",
                    path=environment.binary_paths.driver_executable,
                    version=environment.driver_version,
                )
            )
        except FileNotFoundError as error:
            binaries.append(
                BinaryDiagnostic(
                    name="Ungoogled Chromium",
                    path="Not found",
                    version=str(error),
                )
            )
            binaries.append(
                BinaryDiagnostic(
                    name="ChromeDriver",
                    path="Not found",
                    version=str(error),
                )
            )
        return DiagnosticsReport(capacity=capacity, binaries=binaries)
