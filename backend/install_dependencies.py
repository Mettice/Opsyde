#!/usr/bin/env python
import sys
import subprocess
import os
import time

def print_banner():
    print("\n=== CrewFlow Backend Dependencies Installer ===")
    print("This script will install all required dependencies for the CrewFlow backend.")

def get_current_venv():
    """Check if we're in a virtual environment"""
    return hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)

def install_package(package_name):
    """Install a package using pip"""
    print(f"Installing {package_name}...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
        print(f"✅ Successfully installed {package_name}")
        time.sleep(0.5)  # Slight delay for user readability
        return True
    except subprocess.CalledProcessError:
        print(f"❌ Failed to install {package_name}")
        return False

def main():
    print_banner()
    
    # Check if we're in a virtual environment
    if not get_current_venv():
        print("⚠️ You are not in a virtual environment.")
        create_venv = input("Do you want to create a virtual environment now? (y/n): ")
        if create_venv.lower() == 'y':
            print("Creating virtual environment...")
            subprocess.check_call([sys.executable, "-m", "venv", "venv"])
            print("✅ Virtual environment created. Please activate it and run this script again.")
            print("\nTo activate on Windows:")
            print("    venv\\Scripts\\activate")
            print("\nTo activate on Linux/Mac:")
            print("    source venv/bin/activate")
            return
        else:
            print("Continuing without a virtual environment...")

    print("\nInstalling required packages...")
    
    # Core packages
    core_packages = [
        "fastapi",
        "uvicorn[standard]",
        "pydantic",
        "python-dotenv",
        "PyJWT",
        "passlib[bcrypt]",
        "cryptography"
    ]
    
    # Optional packages
    optional_packages = [
        "PyPDF2",
        "python-docx",
        "spacy",
        "gspread",
        "oauth2client",
        "requests",
        "aiohttp",
        "apscheduler"
    ]
    
    # Install core packages
    for package in core_packages:
        if not install_package(package):
            print(f"⚠️ Warning: Failed to install core package {package}. Some functionality may not work.")
    
    # Install optional packages
    print("\nInstalling optional packages (some features will work without these)...")
    for package in optional_packages:
        if not install_package(package):
            print(f"⚠️ Note: Optional package {package} was not installed. Some features may be disabled.")
    
    # Try to install spaCy English model
    try:
        print("\nInstalling spaCy English language model...")
        subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
        print("✅ Successfully installed spaCy English language model")
    except subprocess.CalledProcessError:
        print("❌ Failed to install spaCy English language model. CV parsing may not work properly.")
    
    print("\n=== Installation Complete ===")
    print("You can now run the backend server with 'python restart_server.py'")

if __name__ == "__main__":
    main() 