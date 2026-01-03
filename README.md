# AR Virtual Desktop Experience

An immersive WebXR-based augmented reality experience that transforms real-world tables into interactive virtual desktops with physics-enabled objects.

## Features

- **Surface Detection**: Automatically detects horizontal plane surfaces (tables) using WebXR Hit Test API
- **Virtual Desktop Placement**: Tap on a detected surface to place a virtual desktop anchored to the real world
- **Physics-Enabled Plates**: Interactive plates with realistic collision detection and physics simulation
- **Touch Interactions**:
  - **Drag**: Touch and move to reposition plates on desktop
  - **Throw**: Quick swipe gesture imparts velocity to plates with realistic bouncing
  - **Collision**: Plates bounce off each other with realistic physics

## Target Platforms

**Primary (MVP)**
- Android devices with WebXR-enabled Chrome browser
- ARCore support required

**Future**
- Meta Quest browser
- Controller-based interaction
- Hand tracking support

## Technical Stack

- **3D Rendering**: Three.js
- **Physics Engine**: Cannon-es
- **Build Tool**: Vite
- **WebXR APIs**: immersive-ar, hit-test, anchors

## Installation

```bash
# Install dependencies
npm install
```

## Development

```bash
# Start development server with HTTPS (required for WebXR)
npm run dev
```

The development server will start on `https://localhost:5173` with self-signed SSL certificate.

## Testing on Android Device

### Prerequisites

1. **Android Device Requirements**:
   - Android 7.0 or higher
   - ARCore support (check compatibility at https://developers.google.com/ar/devices)
   - Chrome browser version 79 or higher

2. **Network Setup**:
   - Ensure your Android device is on the same WiFi network as your development machine

### Steps to Test

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Find your computer's local IP address**:
   - **macOS**: Run `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - **Windows**: Run `ipconfig` and look for IPv4 Address
   - **Linux**: Run `ip addr show`

3. **Access from Android device**:
   - Open Chrome on your Android device
   - Navigate to `https://YOUR_LOCAL_IP:5173` (replace YOUR_LOCAL_IP with the IP from step 2)
   - Example: `https://192.168.1.100:5173`

4. **Accept SSL Certificate**:
   - You'll see a security warning (self-signed certificate)
   - Click "Advanced" → "Proceed to site (unsafe)"
   - This is safe for local development

5. **Enable WebXR**:
   - Make sure "AR" is enabled in Chrome flags (chrome://flags)
   - Look for "WebXR Incubations" and enable it if needed

6. **Test the Application**:
   - Click "Enter AR" button
   - Grant camera permissions when prompted
   - Point your device at a horizontal surface (table, floor, desk)
   - Wait for surface detection overlay to appear
   - Tap the surface to place virtual desktop
   - Interact with plates: drag them around or swipe to throw

## Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

The production build will be output to the `dist/` directory.

## Deployment

### Option 1: GitHub Pages (with Custom Domain for HTTPS)

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the `dist/` folder to GitHub Pages

3. **Important**: GitHub Pages provides HTTPS by default, which is required for WebXR

### Option 2: Netlify/Vercel

1. Connect your repository to Netlify or Vercel
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy (HTTPS is provided automatically)

### Option 3: Self-Hosted with SSL

1. Build the project
2. Host on a web server with valid SSL certificate (Let's Encrypt)
3. Ensure HTTPS is properly configured

**Note**: HTTPS is **required** for WebXR APIs to work in production. Local development uses self-signed certificates.

## Troubleshooting

### "WebXR is not supported" error
- Ensure you're using Chrome on Android (version 79+)
- Check that your device supports ARCore
- Make sure you're accessing via HTTPS (even in development)

### Surface detection not working
- Ensure good lighting conditions
- Point device at a flat, textured surface
- Move device slowly to help ARCore detect surfaces
- Avoid reflective or transparent surfaces

### Performance issues
- Close other apps running on the device
- Reduce the number of spawned plates (edit `SPAWN.MAX_PLATES` in constants.js)
- Test on a device with better ARCore performance

### Can't access from Android device
- Verify both devices are on the same WiFi network
- Check firewall settings on development machine
- Make sure the dev server is running with `--host` flag (already configured)
- Try accessing with your computer's IP address directly

## Project Structure

```
desktop/
├── index.html              # Entry HTML
├── style.css              # Global styles
├── src/
│   ├── main.js            # Application entry point
│   ├── config/
│   │   └── constants.js   # Configuration constants
│   ├── scene/
│   │   ├── SceneManager.js      # Three.js scene setup
│   │   └── MaterialLibrary.js   # PBR materials
│   ├── ar/
│   │   ├── SurfaceDetector.js   # Hit test & surface detection
│   │   └── DesktopPlacer.js     # Desktop placement logic
│   ├── physics/
│   │   └── PhysicsWorld.js      # Cannon.js physics setup
│   ├── objects/
│   │   ├── Plate.js             # Plate object with physics
│   │   └── PlateSpawner.js      # Plate spawning system
│   ├── interaction/
│   │   ├── TouchHandler.js      # Touch input processing
│   │   ├── DragController.js    # Drag interaction
│   │   └── ThrowController.js   # Throw gesture
│   ├── ui/
│   │   ├── EntryPage.js         # Entry page management
│   │   ├── HintDisplay.js       # AR hint text
│   │   └── ErrorHandler.js      # Error messaging
│   └── utils/
│       ├── XRUtils.js           # WebXR utilities
│       └── MathUtils.js         # Math helpers
└── vite.config.js         # Vite configuration
```

## Performance Targets

- **Frame Rate**: 60 FPS
- **Touch Response**: < 100ms latency
- **AR Session Init**: < 3 seconds
- **Surface Detection**: > 90% success rate

## Future Enhancements

- Meta Quest support with controller/hand tracking
- Multiple desktop support
- Session persistence
- Different object types (cups, books, etc.)
- Customizable themes
- Multiplayer features

## License

MIT

## Support

For issues or questions, please refer to the [PRD.md](./PRD.md) and [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed specifications.
