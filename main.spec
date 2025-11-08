# -*- mode: python ; coding: utf-8 -*-

import os
import platform
import sys
from PyInstaller.utils.hooks import collect_submodules

block_cipher = None

current_platform = platform.system().lower()
machine = platform.machine().lower()
architecture = 'arm64' if machine in ('arm64', 'aarch64') else ('x64' if sys.maxsize > 2**32 else 'x86')

if current_platform.startswith('win'):
    exe_name = f'copliot_enigma_windows_{architecture}.exe'
    chrome_portable_path = os.path.join('ungoogled_chromium', 'ungoogled-chromium_129.0.6668.58-1.1_windows')
    chromedriver_source = os.path.join('ungoogled_chromium', 'chromedriver', 'chromedriver-win64', 'chromedriver.exe')
elif current_platform == 'darwin':
    exe_name = f'copliot_enigma_macos_{architecture}'
    chrome_portable_path = os.path.join('ungoogled_chromium', 'Chromium.app')
    chromedriver_source = os.path.join('ungoogled_chromium', 'chromedriver')
else:  # Linux
    exe_name = 'copliot_enigma_linux'
    chrome_portable_path = os.path.join('ungoogled_chromium', 'ungoogled-chromium_129.0.6668.58-1_linux')
    chromedriver_source = os.path.join('ungoogled_chromium', 'ungoogled-chromium_129.0.6668.58-1_linux', 'chromedriver')

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
