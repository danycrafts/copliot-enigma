"""Abstractions around Selenium browser automation used by the desktop app."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional

import platform
import subprocess
import time

from selenium import webdriver
from selenium.common.exceptions import (
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
    WebDriverException,
)
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.alert import Alert
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from utils.filesystem import get_resource_path

from . import logger


@dataclass(frozen=True)
class BrowserBinaryPaths:
    """Represents the filesystem location of the packaged browser binaries."""

    browser_executable: str
    driver_executable: str

    def to_dict(self) -> Dict[str, str]:
        return {
            "browser_executable": self.browser_executable,
            "driver_executable": self.driver_executable,
        }


@dataclass(frozen=True)
class BrowserEnvironment:
    """Metadata about the packaged Chromium and ChromeDriver binaries."""

    binary_paths: BrowserBinaryPaths
    browser_version: str
    driver_version: str

    def to_dict(self) -> Dict[str, str]:
        payload = self.binary_paths.to_dict()
        payload.update(
            {
                "browser_version": self.browser_version,
                "driver_version": self.driver_version,
            }
        )
        return payload


class UIElement:
    """Represents a declarative action against a UI element."""

    def __init__(self, element_data: Dict[str, str]):
        self.element_type: str = element_data.get("element_type", "")
        self.selector_type: str = element_data.get("selector_type", "")
        self.selector_value: str = element_data.get("selector_value", "")
        self.action: str = element_data.get("action", "")
        self.post_action: str = element_data.get("post_action", "")

    def to_dict(self) -> Dict[str, str]:
        return {
            "element_type": self.element_type,
            "selector_type": self.selector_type,
            "selector_value": self.selector_value,
            "action": self.action,
            "post_action": self.post_action,
        }


class BrowserClient:
    """High level Selenium wrapper tailored for the packaged browser."""

    def __init__(
        self,
        timeout_after: int = 15,
        max_retries: int = 5,
        browser_headless: bool = False,
        is_experimental: bool = False,
        wait_timeout: int = 10,
    ):
        self.driver: Optional[webdriver.Chrome] = None
        self.initial_window_handle: Optional[str] = None
        self.timeout_after = timeout_after
        self.max_retries = max_retries
        self.browser_headless = browser_headless
        self.is_experimental = is_experimental
        self.request_interceptor = None
        self.last_request = None
        self.wait_timeout = wait_timeout
        self.wait: Optional[WebDriverWait] = None
        self._binary_paths: Optional[BrowserBinaryPaths] = None

    # ------------------------------------------------------------------
    # Driver bootstrap
    # ------------------------------------------------------------------
    def ensure_driver(self) -> None:
        """Initialise the Chrome driver if it is not already running."""
        if self.driver is None:
            self.initialize_driver()

    def initialize_driver(self) -> None:
        options = self._configure_chrome_options()
        service = self._create_chrome_service(options)

        try:
            self.driver = webdriver.Chrome(service=service, options=options)
            self.wait = WebDriverWait(self.driver, self.wait_timeout)
            self.driver.request_interceptor = self._intercept_request
            self.request_interceptor = self._intercept_request
            self.initial_window_handle = self.driver.current_window_handle
            logger.debug(
                f"Successfully initialised Chromium with window handle {self.initial_window_handle}"
            )
        except WebDriverException as error:
            logger.error(f"Failed to initialise Chrome browser: {error}")
            logger.error(
                "Ensure that the Chromium and ChromeDriver binaries are correctly bundled."
            )
            raise

    def _configure_chrome_options(self) -> Options:
        options = Options()
        if self.browser_headless:
            options.add_argument("--headless=new")
            logger.debug("Headless mode enabled")

        default_arguments = [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--window-size=1450,860",
            "--password-store=basic",
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36",
        ]

        for argument in default_arguments:
            options.add_argument(argument)

        if self.is_experimental:
            experimental_options = {
                "excludeSwitches": ["enable-automation"],
                "useAutomationExtension": False,
                "prefs": {
                    "credentials_enable_service": False,
                    "profile.password_manager_enabled": False,
                },
            }
            for option_name, option_value in experimental_options.items():
                options.add_experimental_option(option_name, option_value)
            logger.debug("Experimental Chrome options applied")

        logger.debug(f"Chrome configured with options: {options.arguments}")
        return options

    def _create_chrome_service(self, options: Options) -> Service:
        self._binary_paths = self._binary_paths or self._resolve_binary_paths()
        options.binary_location = self._binary_paths.browser_executable
        logger.debug(f"Using Chromium binary at {options.binary_location}")
        logger.debug(
            f"Using ChromeDriver binary at {self._binary_paths.driver_executable}"
        )
        return Service(executable_path=self._binary_paths.driver_executable)

    def _resolve_binary_paths(self) -> BrowserBinaryPaths:
        platform_name = platform.system().lower()
        driver_name = "chromedriver.exe" if platform_name.startswith("win") else "chromedriver"

        browser_candidates: Iterable[str]
        if platform_name.startswith("win"):
            browser_candidates = ["chrome.exe"]
        elif platform_name == "darwin":
            browser_candidates = [
                "Chromium.app/Contents/MacOS/Chromium",
                "Chromium",
            ]
        else:
            browser_candidates = ["chrome", "chromium"]

        search_roots = self._candidate_roots()
        browser_path = self._find_binary(search_roots, browser_candidates)
        driver_path = self._find_binary(search_roots, [driver_name])

        if browser_path is None or driver_path is None:
            raise FileNotFoundError(
                "Unable to locate packaged Chromium or ChromeDriver binaries."
            )

        return BrowserBinaryPaths(
            browser_executable=str(browser_path),
            driver_executable=str(driver_path),
        )

    def _candidate_roots(self) -> List[Path]:
        potential_roots = [
            Path(get_resource_path("chrome_portable")),
            Path(get_resource_path("ungoogled_chromium")),
        ]

        roots: List[Path] = []
        for root in potential_roots:
            if root.exists():
                roots.append(root)
        if not roots:
            roots.append(Path(get_resource_path(".")))
        return roots

    @staticmethod
    def _find_binary(roots: Iterable[Path], patterns: Iterable[str]) -> Optional[Path]:
        for root in roots:
            for pattern in patterns:
                candidates = list(root.rglob(pattern))
                for candidate in candidates:
                    if candidate.is_file() or candidate.is_symlink():
                        return candidate
        return None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def visit(self, url: str) -> None:
        self.open_url(url)

    def open_url(self, url: str) -> None:
        self.ensure_driver()
        if not self.driver:
            raise RuntimeError("Chrome driver is not initialised")
        logger.info(f"Navigating to {url}")
        self.driver.get(url)

    def describe_environment(self) -> BrowserEnvironment:
        paths = self._binary_paths or self._resolve_binary_paths()
        browser_version = self._read_binary_version(Path(paths.browser_executable))
        driver_version = self._read_binary_version(Path(paths.driver_executable))
        return BrowserEnvironment(
            binary_paths=paths,
            browser_version=browser_version,
            driver_version=driver_version,
        )

    def _read_binary_version(self, executable: Path) -> str:
        version_commands = [
            [str(executable), "--version"],
            [str(executable), "--product-version"],
        ]
        for command in version_commands:
            try:
                result = subprocess.run(
                    command,
                    capture_output=True,
                    check=True,
                    text=True,
                )
                output = (result.stdout or result.stderr).strip()
                if output:
                    return output
            except (subprocess.CalledProcessError, FileNotFoundError, PermissionError):
                continue
        return "Unknown"

    # ------------------------------------------------------------------
    # Element helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _get_by_selector(selector: str) -> By:
        selector_map = {
            "css": By.CSS_SELECTOR,
            "xpath": By.XPATH,
            "id": By.ID,
            "name": By.NAME,
            "class": By.CLASS_NAME,
            "tag": By.TAG_NAME,
            "link": By.LINK_TEXT,
            "partial": By.PARTIAL_LINK_TEXT,
        }
        return selector_map.get(selector.lower(), By.CSS_SELECTOR)

    def process_elements_chain(self, elements: List[UIElement]) -> None:
        logger.debug(f"Processing {len(elements)} UI elements")
        for element in elements:
            self.process_element(element, self.max_retries)

    def process_element(self, element: UIElement, retries: int) -> None:
        logger.debug(f"Processing element: {element.to_dict()}")
        try:
            found_element = self.wait_for_element(
                selector_value=element.selector_value,
                selector_type=element.selector_type,
            )
            if found_element is None:
                raise NoSuchElementException(element.selector_value)
            found_element = self.scroll_to_element(found_element)
            found_element = self._perform_action(element, found_element)
            if element.post_action:
                self._perform_post_action(element, found_element)
            time.sleep(1)
            logger.debug(f"Successfully processed UI element {element.element_type}")
        except (TimeoutException, NoSuchElementException, StaleElementReferenceException) as error:
            if retries > 0:
                logger.warning(
                    (
                        f"Error interacting with UI element '{element.element_type}': {error}. "
                        f"Retrying {retries} more times."
                    )
                )
                self.process_element(element, retries - 1)
            else:
                logger.error(
                    (
                        f"Failed to process UI element '{element.element_type}' after multiple "
                        f"retries: {error}"
                    )
                )
        except Exception as error:  # pylint: disable=broad-except
            logger.error(f"Failed to process UI element '{element.element_type}': {error}")

    def _perform_action(self, element: UIElement, found_element: WebElement) -> WebElement:
        logger.debug(
            f"Performing action={element.action} on element selector={element.selector_value}"
        )
        if element.action == "click":
            found_element.click()
        elif element.action == "USE_SCRIPT":
            self.driver.execute_script("arguments[0].click();", found_element)
        elif element.action == "text":
            found_element.text
        logger.debug(f"Action {element.action} completed")
        return found_element

    def _perform_post_action(self, element: UIElement, found_element: WebElement) -> WebElement:
        logger.debug(
            f"Performing post-action={element.post_action} on element selector={element.selector_value}"
        )
        if element.post_action == "submit":
            found_element.submit()
        logger.debug(f"Post action {element.post_action} completed")
        return found_element

    def wait_for_element(
        self,
        selector_value: str,
        selector_type: str,
        timeout: Optional[int] = None,
    ) -> Optional[WebElement]:
        self.ensure_driver()
        if not self.driver:
            return None
        wait_timeout = timeout or self.wait_timeout
        locator = (self._get_by_selector(selector_type), selector_value)
        try:
            return WebDriverWait(self.driver, wait_timeout).until(
                EC.presence_of_element_located(locator)
            )
        except TimeoutException:
            logger.debug(
                f"Element {selector_value} not found within {wait_timeout} seconds"
            )
            return None

    def click_element(self, selector_type: str, selector_value: str) -> None:
        element = self.wait_for_element(selector_value, selector_type)
        if element:
            element.click()
        else:
            logger.warning(f"Element {selector_value} not found for clicking")

    def send_keys_to_element(self, selector_type: str, selector_value: str, keys: str) -> None:
        element = self.wait_for_element(selector_value, selector_type)
        if element:
            element.send_keys(keys)
        else:
            logger.warning(f"Element {selector_value} not found for sending keys")

    def wait_for_clickable_element(
        self, selector_type: str, selector_value: str, timeout: Optional[int] = None
    ) -> Optional[WebElement]:
        self.ensure_driver()
        if not self.driver:
            return None
        wait_timeout = timeout or self.wait_timeout
        locator = (self._get_by_selector(selector_type), selector_value)
        try:
            return WebDriverWait(self.driver, wait_timeout).until(
                EC.element_to_be_clickable(locator)
            )
        except TimeoutException:
            logger.debug(
                f"Element {selector_value} not clickable within {wait_timeout} seconds"
            )
            return None

    def handle_shadow_dom(self, host_selector: str, shadow_element_selector: str) -> Optional[WebElement]:
        shadow_host = self.wait_for_element(host_selector, "css")
        if not shadow_host or not self.driver:
            logger.warning(f"Shadow host {host_selector} not found")
            return None
        shadow_root = self.driver.execute_script("return arguments[0].shadowRoot", shadow_host)
        return shadow_root.find_element(By.CSS_SELECTOR, shadow_element_selector)

    def handle_captcha(self) -> None:
        if not self.driver:
            return
        try:
            captcha_frame = self.driver.find_element(By.CSS_SELECTOR, "iframe[src*='captcha']")
            if captcha_frame:
                logger.info("CAPTCHA detected. Waiting for manual resolution.")
                while "captcha" in self.driver.page_source:
                    time.sleep(5)
                logger.info("CAPTCHA solved")
        except NoSuchElementException:
            logger.debug("No CAPTCHA detected")

    def handle_alert(self) -> None:
        if not self.driver:
            return
        try:
            WebDriverWait(self.driver, 5).until(EC.alert_is_present())
            alert = Alert(self.driver)
            logger.info(f"Alert detected: {alert.text}")
            alert.accept()
        except TimeoutException:
            logger.debug("No alert present")

    def save_cookies(self) -> None:
        if not self.driver:
            return
        import pickle

        base_url = self.get_base_url().replace(".", "_")
        path = f"cookies_{base_url}.pkl"
        with open(path, "wb") as file_pointer:
            pickle.dump(self.driver.get_cookies(), file_pointer)

    def load_cookies(self) -> None:
        if not self.driver:
            return
        import pickle

        base_url = self.get_base_url().replace(".", "_")
        path = f"cookies_{base_url}.pkl"
        try:
            with open(path, "rb") as file_pointer:
                cookies = pickle.load(file_pointer)
                for cookie in cookies:
                    self.driver.add_cookie(cookie)
        except FileNotFoundError:
            logger.warning(f"Cookie file {path} not found")

    def get_base_url(self) -> str:
        if not self.driver:
            return ""
        return self.driver.current_url.split("/")[2]

    def scroll_to_element(self, element: WebElement) -> WebElement:
        if self.driver:
            self.driver.execute_script("arguments[0].scrollIntoView();", element)
        return element

    def execute_js(self, script: str, *args):  # type: ignore[override]
        if not self.driver:
            raise RuntimeError("Driver is not initialised")
        return self.driver.execute_script(script, *args)

    def wait_for_ajax(self, timeout: int = 10) -> None:
        if not self.driver:
            return
        end_time = time.time() + timeout
        while time.time() < end_time:
            pending = self.driver.execute_script("return window.jQuery ? jQuery.active : 0")
            if not pending:
                return
            time.sleep(0.5)
        logger.warning(f"AJAX requests did not complete within {timeout} seconds")

    def close_driver(self) -> None:
        if self.driver:
            self.driver.quit()
            self.driver = None
            self.wait = None
            self.initial_window_handle = None
            logger.info("Chrome browser closed successfully")
        else:
            logger.warning("Driver is not initialised")

    # ------------------------------------------------------------------
    # Request interception helpers
    # ------------------------------------------------------------------
    def _intercept_request(self, request):
        self.last_request = request
        logger.debug(f"Intercepted request: {request.method} {request.url}")

    def get_last_request(self):
        return self.last_request

    def perform_action_and_intercept(self, by: str, value: str) -> None:
        self.last_request = None
        element = self.wait_for_clickable_element(by, value)
        if element:
            element.click()
        timeout = 10
        while self.last_request is None and timeout > 0:
            timeout -= 1
            time.sleep(1)
        if self.last_request:
            logger.debug(
                f"Next request after action: {self.last_request.method} {self.last_request.url}"
            )
        else:
            logger.warning("No request intercepted after the action")
