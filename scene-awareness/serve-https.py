#!/usr/bin/env python3
"""
HTTPS server for WebXR demo using self-signed certificate
This will generate a self-signed certificate if one doesn't exist
"""

import http.server
import ssl
import socket
import os
import subprocess
import sys

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

def generate_certificate():
    """Generate self-signed certificate"""
    cert_file = "cert.pem"
    key_file = "key.pem"

    if os.path.exists(cert_file) and os.path.exists(key_file):
        print("Certificate files already exist, using existing certificates.")
        return cert_file, key_file

    print("Generating self-signed certificate...")
    print("This may take a moment...")

    try:
        # Generate self-signed certificate using openssl
        cmd = [
            "openssl", "req", "-x509", "-newkey", "rsa:4096",
            "-keyout", key_file, "-out", cert_file,
            "-days", "365", "-nodes",
            "-subj", "/CN=localhost"
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        print("Certificate generated successfully!")
        return cert_file, key_file
    except subprocess.CalledProcessError as e:
        print(f"Error generating certificate: {e}")
        print("Make sure OpenSSL is installed on your system.")
        sys.exit(1)
    except FileNotFoundError:
        print("OpenSSL not found. Please install OpenSSL:")
        print("  macOS: brew install openssl")
        print("  Linux: apt-get install openssl or yum install openssl")
        sys.exit(1)

def main():
    cert_file, key_file = generate_certificate()

    Handler = http.server.SimpleHTTPRequestHandler

    httpd = http.server.HTTPServer(("", PORT), Handler)

    # Create SSL context
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(cert_file, key_file)

    # Wrap the socket with SSL
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

    ip = get_ip()
    print("=" * 60)
    print(f"HTTPS Server running at:")
    print(f"  Local:   https://localhost:{PORT}")
    print(f"  Network: https://{ip}:{PORT}")
    print("=" * 60)
    print("\nIMPORTANT: Using self-signed certificate")
    print("You'll need to accept the security warning in your browser:")
    print("  - Click 'Advanced' or 'Show Details'")
    print("  - Click 'Proceed to localhost' or 'Accept Risk'")
    print("\nFor Quest 3 users:")
    print("  1. Open the network URL in Oculus Browser")
    print("  2. Accept the certificate warning")
    print("  3. Bookmark the page for easier access")
    print("\nPress Ctrl+C to stop the server")
    print("=" * 60)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer stopped.")
        httpd.shutdown()

if __name__ == "__main__":
    main()
