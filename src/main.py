from utils.logger import Logger
import tkinter as tk
import ttkbootstrap as ttk
from driver.selenium import BrowserClient
from utils.helpers import calculate_max_browsers_or_tabs
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from tkinter import messagebox
import time

def main():
    logger = Logger(log_file="app.log")
    client = BrowserClient()

    # Initialize the main application window
    root = create_main_window()
    
    # Create a notebook for tabs
    notebook = create_notebook(root)

    # Create tabs
    tab1, tab2, tab3 = create_tabs(notebook)

    # Initialize the Selenium driver and perform initial actions
    initialize_browser(client)

    # Display system information
    display_system_info(tab1, logger)

    # Create Chrome test button in tab1
    create_chrome_test_button(tab1, client)

    # Create time display in tab2
    create_time_display(tab2)

    # Create a simple form in tab3
    create_form(tab3)

    # Ensure the browser is closed when the application exits
    root.protocol("WM_DELETE_WINDOW", lambda: [client.close_driver(), root.destroy()])

    root.mainloop()

def create_main_window():
    root = tk.Tk()
    root.title("ScrapeGoat Tool")
    root.geometry("1260x915")
    root.resizable(False, False)
    return root

def create_notebook(root):
    notebook = ttk.Notebook(root)
    notebook.pack(expand=True, fill="both", padx=10, pady=10)
    return notebook

def create_tabs(notebook):
    tab1 = ttk.Frame(notebook)
    tab2 = ttk.Frame(notebook)
    tab3 = ttk.Frame(notebook)

    notebook.add(tab1, text="Tab 1")
    notebook.add(tab2, text="Tab 2")
    notebook.add(tab3, text="Tab 3")
    
    return tab1, tab2, tab3

def initialize_browser(client):
    client.initialize_driver()
    
def display_system_info(tab1, logger):
    results = calculate_max_browsers_or_tabs(browser="chrome")
    info_frame = ttk.Frame(tab1)
    info_frame.pack(pady=10, padx=10, fill="both", expand=True)

    ttk.Label(info_frame, text="System Information", font=("TkDefaultFont", 12, "bold")).pack(pady=(0, 10))

    # Create a table to display system information
    table = ttk.Treeview(info_frame, columns=("Property", "Value"), show="headings", height=6)
    table.heading("Property", text="Property")
    table.heading("Value", text="Value")
    table.column("Property", width=150, anchor="w")
    table.column("Value", width=350, anchor="w")

    # Insert system info into the table
    for key, value in results['system_info'].items():
        table.insert("", "end", values=(key.capitalize(), value))

    table.pack(pady=5)

    memory_usage_label = ttk.Label(info_frame, text=f"Estimated memory usage per Chrome browser/tab: {results['avg_memory_per_browser_mb']:.2f} MB")
    memory_usage_label.pack(anchor="w", pady=2)

    ram_browsers_label = ttk.Label(info_frame, text=f"Max browsers by available RAM: {results['max_browsers_by_ram']}")
    ram_browsers_label.pack(anchor="w", pady=2)

    cpu_browsers_label = ttk.Label(info_frame, text=f"Max browsers by CPU cores: {results['max_browsers_by_cpu']}")
    cpu_browsers_label.pack(anchor="w", pady=2)

    max_browsers_label = ttk.Label(info_frame, text=f"Max browsers that can be opened simultaneously: {results['max_browsers']}")
    max_browsers_label.pack(anchor="w", pady=2)

    # Log the information
    logger.info(f"System Info: {results['system_info']}")
    logger.info(f"Estimated memory usage per Chrome browser/tab: {results['avg_memory_per_browser_mb']:.2f} MB")
    logger.info(f"Max browsers by available RAM: {results['max_browsers_by_ram']}")
    logger.info(f"Max browsers by CPU cores: {results['max_browsers_by_cpu']}")
    logger.info(f"Max browsers that can be opened simultaneously: {results['max_browsers']}")

def create_chrome_test_button(tab1, client):
    chrome_test_button = ttk.Button(tab1, text="Test Chrome", command=lambda: test_chrome(client))
    chrome_test_button.pack(pady=10)

def test_chrome(client):
    try:
        client.visit('https://www.example.com')
        WebDriverWait(client.driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        page_title = client.driver.title
        messagebox.showinfo("Chrome Test Result", f"Successfully loaded: {page_title}")
    except Exception as e:
        messagebox.showerror("Chrome Test Error", f"An error occurred: {str(e)}")

def create_time_display(tab2):
    time_label = ttk.Label(tab2, font=('calibri', 40, 'bold'))
    time_label.pack(pady=20)
    update_time(time_label)  # Start updating the time

def update_time(time_label):
    current_time = time.strftime('%H:%M:%S')
    time_label.config(text=current_time)
    time_label.after(1000, update_time, time_label)  # Update every 1 second

def create_form(tab3):
    ttk.Label(tab3, text="Name:").pack(pady=5)
    name_entry = ttk.Entry(tab3)
    name_entry.pack(pady=5)

    ttk.Label(tab3, text="Email:").pack(pady=5)
    email_entry = ttk.Entry(tab3)
    email_entry.pack(pady=5)

    submit_button = ttk.Button(tab3, text="Submit", command=lambda: submit_form(name_entry, email_entry))
    submit_button.pack(pady=10)

def submit_form(name_entry, email_entry):
    name = name_entry.get()
    email = email_entry.get()
    messagebox.showinfo("Form Submission", f"Name: {name}\nEmail: {email}")

if __name__ == "__main__":
    main()
