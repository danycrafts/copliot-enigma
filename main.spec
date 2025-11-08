# -*- mode: python ; coding: utf-8 -*-

import glob
import os
import platform
import sys
from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules

block_cipher = None

current_platform = platform.system().lower()
machine = platform.machine().lower()
architecture = 'arm64' if machine in ('arm64', 'aarch64') else ('x64' if sys.maxsize > 2**32 else 'x86')

BASE_DIR = Path(__file__).resolve().parent


def _find_first_match(patterns: list[str], *, require_dir: bool) -> str:
    """Return the first existing path that matches any of the provided glob patterns."""

    for pattern in patterns:
        matches = sorted(glob.glob(pattern, recursive=True))
        for match in matches:
            if require_dir and os.path.isdir(match):
                return match
            if not require_dir and os.path.isfile(match):
                return match
    raise FileNotFoundError(f"Unable to locate resource using patterns: {patterns}")


base_path = (BASE_DIR / 'ungoogled_chromium').resolve()

if current_platform.startswith('win'):
    exe_name = f'copliot_enigma_windows_{architecture}.exe'
    chrome_portable_path = _find_first_match(
        [
            str(base_path / 'ungoogled-chromium_*_windows*'),
            str(base_path / 'ungoogled-chromium_*_windows'),
        ],
        require_dir=True,
    )
    chromedriver_source = _find_first_match(
        [
            str(base_path / 'chromedriver.exe'),
            str(base_path / 'chromedriver' / 'chromedriver.exe'),
            str(base_path / 'chromedriver' / 'chromedriver-win64' / 'chromedriver.exe'),
        ],
        require_dir=False,
    )
elif current_platform == 'darwin':
    exe_name = f'copliot_enigma_macos_{architecture}'
    chrome_portable_path = _find_first_match(
        [
            str(base_path / 'Chromium.app'),
            str(base_path / '**' / 'Chromium.app'),
        ],
        require_dir=True,
    )
    chromedriver_source = _find_first_match(
        [
            str(base_path / 'chromedriver'),
            str(base_path / 'chromedriver' / 'chromedriver'),
        ],
        require_dir=False,
    )
else:  # Linux
    exe_name = 'copliot_enigma_linux'
    chrome_portable_path = _find_first_match(
        [
            str(base_path / 'ungoogled-chromium_*_linux*'),
            str(base_path / 'ungoogled-chromium_*_linux'),
            str(base_path / '**' / 'ungoogled-chromium_*_linux*'),
            str(base_path / '**' / 'ungoogled-chromium_*_linux'),
        ],
        require_dir=True,
    )
    chromedriver_source = _find_first_match(
        [
            str(base_path / 'chromedriver'),
            str(base_path / 'chromedriver' / 'chromedriver'),
            str(base_path / 'ungoogled-chromium_*_linux*' / 'chromedriver'),
            str(base_path / '**' / 'ungoogled-chromium_*_linux*' / 'chromedriver'),
        ],
        require_dir=False,
    )

binaries = [(chromedriver_source, 'chromedriver')]

# Bundle Chromium as data to avoid macOS codesign issues.
if current_platform == 'darwin':
    datas = [(chrome_portable_path, os.path.join('chrome_portable', 'Chromium.app'))]
else:
    datas = [(chrome_portable_path, 'chrome_portable')]

a = Analysis(
    ['src/main.py'],
    pathex=['src'],
    binaries=binaries,
    datas=datas,
    hiddenimports=collect_submodules('tkinter') + collect_submodules('ttkbootstrap') + ['win32ctypes.pywin32', 'pywintypes', 'win32api'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name=exe_name,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
