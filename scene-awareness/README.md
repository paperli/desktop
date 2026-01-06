# WebXR Horizontal Plane Detection Demo

A simple WebXR application that detects and visualizes horizontal planes in real-time on AR-capable devices.

## Features

- Real-time horizontal plane detection
- Visual representation of detected planes with random colors
- Wireframe outlines for better visibility
- Live plane count display
- Automatic updates as planes are detected or removed

## Requirements

- An AR-capable device (Android phone with ARCore or Meta Quest 3)
- A browser that supports WebXR (Chrome, Edge, or Oculus Browser)
- HTTPS connection (required for WebXR)

## Running the Demo

WebXR **requires HTTPS** for security. Choose one of these methods:

### Method 1: Quick Start (Recommended)

Run the automated setup script:

```bash
./start-https.sh
```

This will let you choose between ngrok (easiest) or self-signed certificate.

### Method 2: Using ngrok (Easiest - No Certificate Warnings)

1. Start the HTTP server:
   ```bash
   python3 serve.py
   ```

2. In a new terminal, start ngrok:
   ```bash
   ngrok http 8000
   ```

3. Copy the HTTPS URL from ngrok (e.g., `https://abc123.ngrok.io`)

4. Open that URL on your AR device (Android phone or Quest 3)

5. Done! No certificate warnings to accept.

### Method 3: Using Self-Signed Certificate (Works Offline)

1. Start the HTTPS server:
   ```bash
   python3 serve-https.py
   ```

2. Note the network URL displayed (e.g., `https://192.168.1.100:8000`)

3. Open that URL on your AR device

4. Accept the security warning:
   - Tap "Advanced" or "Show Details"
   - Tap "Proceed" or "Accept Risk"
   - This is safe - it's your own local server

5. Bookmark the page for easier access later

### Method 4: Deploy to Hosting Service

Deploy `index.html` to any HTTPS hosting service (GitHub Pages, Netlify, Vercel, etc.) for permanent access.

## Usage

1. Open the app in your AR-capable browser
2. Grant camera and motion sensor permissions when prompted
3. Click "Start AR" button
4. Point your device at horizontal surfaces (floor, table, desk)
5. Watch as colored planes appear over detected horizontal surfaces
6. The plane count updates in real-time in the top-left corner

## Tested Devices

- Android phones with ARCore support (Chrome browser)
- Meta Quest 3 (Oculus Browser)

## Troubleshooting

- **"AR Not Supported"**: Your device/browser doesn't support WebXR
- **"WebXR Not Available"**: Use a compatible browser (Chrome, Edge, Oculus Browser)
- **No planes detected**: Move your device slowly and ensure good lighting
- **Connection issues**: Ensure your device and computer are on the same network
