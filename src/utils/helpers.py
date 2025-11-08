import psutil
import platform
import os
import subprocess
import re

def get_system_info():
    """Gather system information such as architecture, number of cores, RAM, and CPU usage."""
    system_info = {
        'architecture': platform.machine(),
        'num_cores': psutil.cpu_count(logical=True),
        'available_ram_gb': psutil.virtual_memory().available / (1024 ** 3),  # Convert bytes to GB
        'total_ram_gb': psutil.virtual_memory().total / (1024 ** 3),  # Convert bytes to GB
        'cpu_usage_percent': psutil.cpu_percent(interval=1),
    }

    if platform.system().lower() == 'windows':
        system_info['os'] = 'Windows'
        system_info['os_version'] = platform.version()
    elif platform.system().lower() == 'darwin':
        system_info['os'] = 'macOS'
        system_info['os_version'] = platform.mac_ver()[0]
    elif platform.system().lower() == 'linux':
        system_info['os'] = 'Linux'
        system_info['os_version'] = platform.release()
    else:
        system_info['os'] = 'Unknown'
        system_info['os_version'] = 'Unknown'

    return system_info

def get_browser_memory_usage(browser="chrome"):
    """Estimate the average memory consumption per browser instance/tab."""
    if browser == "chrome":
        return _get_chrome_memory_usage()
    elif browser == "firefox":
        return _get_firefox_memory_usage()
    else:
        raise ValueError("Unsupported browser: Only 'chrome' and 'firefox' are supported.")

def calculate_max_browsers_or_tabs(browser="chrome"):
    """Calculate the maximum number of browser instances or tabs that can be opened simultaneously."""
    # Get system information
    system_info = get_system_info()

    # Estimate average memory usage per browser instance
    avg_memory_per_browser = get_browser_memory_usage(browser)

    # Max number of browsers by RAM (leave a safety margin of 20% of the available RAM)
    max_by_ram = int(system_info['available_ram_gb'] * 1024 / avg_memory_per_browser * 0.8)  # Safety margin

    # Estimate CPU requirements (assuming each browser uses about 1 full core)
    max_by_cpu = system_info['num_cores']

    # The maximum is determined by the lower of RAM or CPU limits
    max_browsers = min(max_by_ram, max_by_cpu)

    return {
        'max_browsers_by_ram': max_by_ram,
        'max_browsers_by_cpu': max_by_cpu,
        'max_browsers': max_browsers,
        'system_info': system_info,
        'avg_memory_per_browser_mb': avg_memory_per_browser
    }

def _get_chrome_memory_usage():
    """Use Chrome to open a tab and measure memory usage."""
    return _estimate_memory_usage("chrome")

def _get_firefox_memory_usage():
    """Use Firefox to open a tab and measure memory usage."""
    return _estimate_memory_usage("firefox")

def _estimate_memory_usage(browser):
    """Helper to estimate memory usage by launching a browser."""
    # Launch a browser instance in the background and measure its memory usage
    if browser == "chrome":
        process = subprocess.Popen(["google-chrome", "--headless", "--disable-gpu", "--remote-debugging-port=9222"])
    elif browser == "firefox":
        process = subprocess.Popen(["firefox", "--headless"])

    # Allow the browser to initialize
    import time
    time.sleep(5)

    # Check memory usage of the browser process
    browser_memory = 0
    for proc in psutil.process_iter(['pid', 'name']):
        if browser in proc.info['name'].lower():
            browser_memory += proc.memory_info().rss / (1024 ** 2)  # Convert bytes to MB

    # Kill the browser instance
    process.terminate()

    return browser_memory

def transform_url(url):
    """Transform the URL by replacing '.' with '_'."""
    # Use regex to extract the domain part from the URL
    domain = re.search(r"https?://([^/]+)", url).group(1)
    # Replace '.' with '_'
    transformed_domain = domain.replace('.', '_')
    
    return transformed_domain

# https://webcache.googleusercontent.com/search?q=cache:
def get_cached_url(url):
    return f"https://webcache.googleusercontent.com/search?q=cache:{url}"

#  //*[@id="bN015htcoyT__google-cache-hdr"]
def get_snapshot_date(body_html):
    date_str = re.search(r'\d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT', body_html).group(0)
    return date_str
