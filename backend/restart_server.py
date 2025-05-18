import os
import json
import subprocess
import sys
import time

def kill_existing_server():
    """Kill any existing server processes"""
    print("Checking for existing server processes...")
    # Different commands for different operating systems
    if sys.platform == 'win32':
        try:
            subprocess.run(['taskkill', '/F', '/IM', 'python.exe', '/FI', 'WINDOWTITLE eq fastapi'], 
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except Exception as e:
            print(f"Error killing existing processes: {e}")
    else:
        try:
            subprocess.run(['pkill', '-f', 'uvicorn main:app'], 
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except Exception as e:
            print(f"Error killing existing processes: {e}")
    
    # Wait for processes to terminate
    print("Waiting for existing processes to terminate...")
    time.sleep(2)

def start_server():
    """Start the backend server"""
    print("Starting backend server...")
    # Use different command based on operating system
    if sys.platform == 'win32':
        cmd = ['python', 'run.py']
    else:
        cmd = ['python3', 'run.py']
    
    # Start server in a new process
    try:
        process = subprocess.Popen(cmd)
        print(f"Server started with PID {process.pid}")
        return process
    except Exception as e:
        print(f"Error starting server: {e}")
        return None

def ensure_directories():
    """Ensure necessary directories exist"""
    directories = ["data", "data/workflows", "data/triggers", "data/outputs"]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Ensured directory exists: {directory}")

if __name__ == "__main__":
    print("=== Backend Server Restart Script ===")
    
    # Ensure we're in the right directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    print(f"Working directory: {os.getcwd()}")
    
    # Ensure directories exist
    ensure_directories()
    
    # Kill existing server process
    kill_existing_server()
    
    # Start server
    server_process = start_server()
    
    if server_process:
        print("\nServer has been restarted successfully.")
        print("Press Ctrl+C to stop the server.")
        try:
            # Wait for server to run
            server_process.wait()
        except KeyboardInterrupt:
            print("\nStopping server...")
            server_process.terminate()
            print("Server stopped.")
    else:
        print("Failed to start server.") 