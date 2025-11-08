#!/usr/bin/env python3
"""Print diagnostic information about packaged Chromium and ChromeDriver binaries."""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List
import subprocess
import sys


@dataclass
class BinaryInfo:
    name: str
    path: Path | None
    version: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--search-root",
        action="append",
        default=["ungoogled_chromium", "chrome_portable"],
        help="Root directories (relative or absolute) to search for binaries.",
    )
    return parser.parse_args()


def expand_roots(root_arguments: Iterable[str]) -> List[Path]:
    roots: List[Path] = []
    for root in root_arguments:
        path = Path(root).expanduser()
        if not path.is_absolute():
            path = Path.cwd() / path
        if path.exists():
            roots.append(path)
    if not roots:
        roots.append(Path.cwd())
    return roots


def find_binary(roots: Iterable[Path], patterns: Iterable[str]) -> Path | None:
    for root in roots:
        for pattern in patterns:
            for candidate in root.rglob(pattern):
                if candidate.is_file() or candidate.is_symlink():
                    return candidate
    return None


def read_version(executable: Path | None) -> str:
    if executable is None:
        return "Not found"
    commands = [
        [str(executable), "--version"],
        [str(executable), "--product-version"],
    ]
    for command in commands:
        try:
            completed = subprocess.run(
                command,
                capture_output=True,
                check=True,
                text=True,
            )
            output = (completed.stdout or completed.stderr).strip()
            if output:
                return output
        except (FileNotFoundError, PermissionError, subprocess.CalledProcessError):
            continue
    return "Unknown"


def collect_binary_info(roots: List[Path]) -> List[BinaryInfo]:
    platform_patterns = {
        "chromium": [
            "chrome.exe",
            "Chromium.app/Contents/MacOS/Chromium",
            "chrome",
            "chromium",
        ],
        "chromedriver": ["chromedriver.exe", "chromedriver"],
    }

    chromium_path = find_binary(roots, platform_patterns["chromium"])
    chromedriver_path = find_binary(roots, platform_patterns["chromedriver"])

    return [
        BinaryInfo(
            name="Ungoogled Chromium",
            path=chromium_path,
            version=read_version(chromium_path),
        ),
        BinaryInfo(
            name="ChromeDriver",
            path=chromedriver_path,
            version=read_version(chromedriver_path),
        ),
    ]


def main() -> None:
    args = parse_args()
    roots = expand_roots(args.search_root)
    print("Browser asset debug report")
    print("===========================")
    for root in roots:
        print(f"Search root: {root}")
    binaries = collect_binary_info(roots)
    for binary in binaries:
        print(f"\n{binary.name}:")
        if binary.path:
            print(f"  Path: {binary.path}")
        else:
            print("  Path: Not found")
        print(f"  Version: {binary.version}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # pragma: no cover - diagnostic script should not crash CI
        print(f"Failed to inspect browser binaries: {exc}", file=sys.stderr)
        sys.exit(1)
