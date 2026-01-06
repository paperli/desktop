#!/usr/bin/env python3
"""
Simple HTTP server for WebXR demo
Run this script and access the app from your AR device using your computer's IP address
"""

import http.server
import socketserver
import socket

PORT = 8000

def get_ip():
    """Get the local IP address"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    ip = get_ip()
    print("=" * 60)
    print(f"Server running at:")
    print(f"  Local:   http://localhost:{PORT}")
    print(f"  Network: http://{ip}:{PORT}")
    print("=" * 60)
    print("\nAccess from your AR device using the Network URL above")
    print("Note: WebXR requires HTTPS. For production, use ngrok or proper HTTPS.")
    print("\nPress Ctrl+C to stop the server")
    print("=" * 60)
    httpd.serve_forever()
