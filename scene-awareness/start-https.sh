#!/bin/bash

echo "WebXR HTTPS Server Setup"
echo "========================"
echo ""
echo "Choose your preferred method:"
echo "1) ngrok (Recommended - easiest, no certificate warnings)"
echo "2) Self-signed certificate (Works offline, requires accepting warning)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "Starting HTTP server..."
        python3 serve.py &
        SERVER_PID=$!
        sleep 2

        echo ""
        echo "Starting ngrok tunnel..."
        echo "Press Ctrl+C to stop both servers"
        echo ""

        ngrok http 8000

        # Clean up
        kill $SERVER_PID 2>/dev/null
        ;;
    2)
        echo ""
        echo "Starting HTTPS server with self-signed certificate..."
        python3 serve-https.py
        ;;
    *)
        echo "Invalid choice. Please run again and choose 1 or 2."
        exit 1
        ;;
esac
