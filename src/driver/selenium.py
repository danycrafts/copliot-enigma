from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import WebDriverException, TimeoutException, NoSuchElementException, StaleElementReferenceException
from selenium import webdriver
from selenium.webdriver.common.alert import Alert
from utils.filesystem import get_resource_path
from . import logger

from typing import Dict, List, Optional
import time
import os
import sys
import platform

class UIElement:
    def __init__(self, element_data: Dict[str, str]):
        self.element_type: str = element_data.get('element_type', '')
        self.selector_type: str = element_data.get('selector_type', '')
        self.selector_value: str = element_data.get('selector_value', '')
        self.action: str = element_data.get('action', '')
        self.post_action: str = element_data.get('post_action', '')

    def to_dict(self) -> Dict[str, str]:
        return {
            'element_type': self.element_type,
            'selector_type': self.selector_type,
            'selector_value': self.selector_value,
            'action': self.action,
            'post_action': self.post_action,
        }

class BrowserClient:
    def __init__(self, timeout_after: int = 15, max_retries: int = 5, browser_headless: bool = False, is_experimental: bool = False):
        self.driver: Optional[webdriver.Chrome] = None
        self.initial_window_handle: Optional[str] = None
        self.timeout_after = timeout_after
        self.max_retries = max_retries
        self.browser_headless = browser_headless
        self.is_experimental = is_experimental
        self.request_interceptor = None
        self.last_request = None
        self.wait = WebDriverWait(self.driver, 10)

    def initialize_driver(self):
        options = self._configure_chrome_options()
        service = self._get_chrome_service(options)
        
        try:
            self.driver = webdriver.Chrome(service=service, options=options)
            self.driver.request_interceptor = self._intercept_request
            self.request_interceptor = self._intercept_request
            self.initial_window_handle = self.driver.current_window_handle
            logger.debug(f"Successfully Initialized Chrome Browser with Initial Window Handle: {self.initial_window_handle}")
        except WebDriverException as error:
            logger.error(f"Failed to initialize Chrome browser: {error}")
            logger.error("Ensure that the Chrome Portable and ChromeDriver binaries are correctly bundled.")

    def _configure_chrome_options(self) -> Options:
        options = Options()
        if self.browser_headless:
            options.add_argument("--headless")
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
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36"
        ]
        
        for arg in default_arguments:
            options.add_argument(arg)

        if self.is_experimental:
            experimental_options = [
                ("excludeSwitches", ["enable-automation"]),
                ("useAutomationExtension", False),
                ("prefs", {"credentials_enable_service": False, "profile.password_manager_enabled": False})
            ]
            for option, value in experimental_options:
                options.add_experimental_option(option, value)
            logger.debug("Experimental options added")

        logger.debug(f"Chrome configured with options: {options.arguments}")
        return options

    def _get_chrome_service(self, options: Options) -> Service:
        current_platform = platform.system().lower()
        if getattr(sys, 'frozen', False):
            chrome_path = get_resource_path('chrome_portable')
            chromedriver_path = get_resource_path('chromedriver')
        else:
            chrome_path = get_resource_path(os.path.join('ungoogled_chromium'))
            chromedriver_path = get_resource_path(os.path.join('ungoogled_chromium'))

        if current_platform.startswith('win'):
            chrome_binary = 'chrome.exe'
            chromedriver_binary = 'chromedriver.exe'
            chrome_path = os.path.join(chrome_path, 'ungoogled-chromium_129.0.6668.58-1.1_windows')
            chromedriver_path = os.path.join(chromedriver_path, 'chromedriver', 'chromedriver-win64')
        elif current_platform == 'darwin':
            chrome_binary = 'Chromium'
            chromedriver_binary = 'chromedriver'
            chrome_path = os.path.join(chrome_path, 'Chromium.app', 'Contents', 'MacOS')
        else:  # Linux
            chrome_binary = 'chrome'
            chromedriver_binary = 'chromedriver'
            chrome_path = os.path.join(chrome_path, 'ungoogled-chromium_129.0.6668.58-1_linux')
            chromedriver_path = chrome_path

        chrome_binary_path = get_resource_path(os.path.join(chrome_path, chrome_binary))
        chromedriver_binary_path = get_resource_path(os.path.join(chromedriver_path, chromedriver_binary))

        service = Service(executable_path=chromedriver_binary_path)
        options.binary_location = chrome_binary_path

        return service

    def visit(self, url):
        """Visit the target URL."""
        self.driver.get(url)
        
    @staticmethod
    def _get_by_selector(selector: str):
        selector_map = {
            "css": By.CSS_SELECTOR,
            "xpath": By.XPATH,
            "id": By.ID,
            "name": By.NAME,
            "class": By.CLASS_NAME,
            "tag": By.TAG_NAME,
            "link": By.LINK_TEXT,
            "partial": By.PARTIAL_LINK_TEXT
        }
        selector_type = selector.lower().split(':')[0]
        return selector_map.get(selector_type, By.NAME)

    def process_elements_chain(self, elements: List[UIElement]):
        logger.debug(f"Processing {len(elements)} Elements Chain")
        for element in elements:
            self.process_element(element, self.max_retries)

    def process_element(self, element: UIElement, retries: int):
        logger.debug(f"Processing element: {element.to_dict()}")
        try:
            found_element = self.wait_for_element(element.selector_value, element.selector_type)
            found_element = self.scroll_to_element(By.CSS_SELECTOR, found_element)
            found_element = self._perform_action(element, found_element)
            if element.post_action:
                found_element = self._perform_post_action(element, found_element)
            time.sleep(1)
            logger.debug(f"Successfully Processed UIElement {element.element_type}")
        except (TimeoutException, NoSuchElementException, StaleElementReferenceException) as e:
            if retries > 0:
                logger.warning(f"Error interacting with UIElement '{element.element_type}': {str(e)}. Retrying {retries} more times.")
                self.process_element(element, retries - 1)
            else:
                logger.error(f"Failed to process UIElement with selector '{element.element_type}' after multiple retries: {e}")
        except Exception as e:
            logger.error(f"Failed to process UIElement with selector '{element.element_type}': {e}")



    def _perform_action(self, element: UIElement, found_element: WebElement) -> WebElement:
        logger.debug(f"Performing action={element.action} on UIElement={element.selector_value}")
        if element.action == 'click':
            found_element.click()
        elif element.action == 'USE_SCRIPT':
            self.driver.execute_script("arguments[0].click();", found_element)
        logger.debug(f"Action {element.action} performed successfully")
        return found_element

    def _perform_post_action(self, element: UIElement, found_element: WebElement) -> WebElement:
        logger.debug(f"Performing post-action={element.post_action} on UIElement={element.selector_value}")
        if element.post_action == 'submit':
            found_element.submit()
        logger.debug(f"Post-action {element.post_action} performed successfully")
        return found_element

    def _intercept_request(self, request):
        """Intercept the HTTP request and store it."""
        self.last_request = request
        print(f"Intercepted request: {request.method} {request.url}")

    def get_last_request(self):
        """Return the last intercepted request."""
        return self.last_request

    def perform_action_and_intercept(self, by, value):
        """Perform an action and intercept the next HTTP request."""
        self.last_request = None  # Reset the last request
        self.click_element(by, value)

        # Wait for the request to be intercepted
        timeout = 10  # seconds
        while self.last_request is None and timeout > 0:
            timeout -= 1
            time.sleep(1)

        if self.last_request:
            print(f"Next request after action: {self.last_request.method} {self.last_request.url}")
        else:
            print("No request intercepted after the action.")

    def wait_for_element(self, by, value, timeout=10):
        """Wait for an element to become available."""
        try:
            return WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((by, value))
            )
        except TimeoutException:
            print(f"Element {value} not found within {timeout} seconds")
            return None

    def click_element(self, by, value):
        """Click an element and handle exceptions."""
        element = self.wait_for_element(by, value)
        if element:
            element.click()
        else:
            print(f"Element {value} not found for clicking")

    def send_keys_to_element(self, by, value, keys):
        """Send keys to an input field."""
        element = self.wait_for_element(by, value)
        if element:
            element.send_keys(keys)
        else:
            print(f"Element {value} not found for sending keys")

    def wait_for_clickable_element(self, by, value, timeout=10):
        """Wait for an element to be clickable."""
        try:
            return WebDriverWait(self.driver, timeout).until(
                EC.element_to_be_clickable((by, value))
            )
        except TimeoutException:
            print(f"Element {value} not clickable within {timeout} seconds")
            return None

    def handle_shadow_dom(self, host_selector, shadow_element_selector):
        """Access an element inside a Shadow DOM."""
        try:
            shadow_host = self.wait_for_element(By.CSS_SELECTOR, host_selector)
            shadow_root = self.driver.execute_script("return arguments[0].shadowRoot", shadow_host)
            return shadow_root.find_element(By.CSS_SELECTOR, shadow_element_selector)
        except NoSuchElementException:
            print(f"Shadow DOM element {shadow_element_selector} not found")
            return None

    def handle_captcha(self):
        """Detect CAPTCHA presence and wait for manual input."""
        try:
            captcha_frame = self.driver.find_element(By.CSS_SELECTOR, "iframe[src*='captcha']")
            if captcha_frame:
                print("CAPTCHA detected. Please solve it manually.")
                while "captcha" in self.driver.page_source:
                    time.sleep(5)
                print("CAPTCHA solved!")
        except NoSuchElementException:
            print("No CAPTCHA detected")

    def handle_alert(self):
        """Handle browser alerts."""
        try:
            WebDriverWait(self.driver, 5).until(EC.alert_is_present())
            alert = Alert(self.driver)
            print(f"Alert detected: {alert.text}")
            alert.accept()
        except TimeoutException:
            print("No alert present")


    def save_cookies(self):
        """Save cookies to a file."""
        import pickle
        base_url = self.get_base_url().replace('.', '_')
        path = f'cookies_{base_url}.pkl'
        with open(path, 'wb') as file:
            pickle.dump(self.driver.get_cookies(), file)

    def load_cookies(self):
        """Load cookies from a file."""
        import pickle
        base_url = self.get_base_url().replace('.', '_')
        path = f'cookies_{base_url}.pkl'
        try:
            with open(path, 'rb') as file:
                cookies = pickle.load(file)
                for cookie in cookies:
                    self.driver.add_cookie(cookie)
        except FileNotFoundError:
            print("Cookie file not found")

    def scroll_to_element(self, by, value):
        """Scroll to an element using JavaScript."""
        element = self.wait_for_element(by, value)
        if element:
            self.driver.execute_script("arguments[0].scrollIntoView();", element)

    def execute_js(self, script, *args):
        """Execute JavaScript on the page."""
        return self.driver.execute_script(script, *args)

    def wait_for_ajax(self, timeout=10):
        """Wait for all AJAX requests to complete."""
        try:
            WebDriverWait(self.driver, timeout).until(
                lambda driver: driver.execute_script('return jQuery.active == 0')
            )
        except TimeoutException:
            print("AJAX requests did not complete within the timeout")
            
    def close_driver(self):
        if self.driver:
            self.driver.quit()
            self.driver = None
            self.initial_window_handle = None
            logger.info("Chrome Browser closed successfully!")
        else:
            logger.warning("Driver is not initialized!")