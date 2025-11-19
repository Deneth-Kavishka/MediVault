# MediVault Favicon

## Design

The MediVault favicon features a **medicine pill blister pack** icon in the application's signature **medical teal color** (#1494B5).

## Features

- 🎨 **Color Scheme**: Medical teal (#1494B5) matching the application theme
- 💊 **Icon**: Medicine/pill blister pack representing healthcare
- 📐 **Formats**: SVG (modern browsers) and PNG (universal support)
- 📱 **Responsive**: Works across all devices and screen sizes

## Files

- `favicon.svg` - Vector format (preferred by modern browsers)
- `favicon.png` - 64x64px PNG format (universal compatibility)

## Implementation

The favicon is referenced in `client/index.html`:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/favicon.png" />
<meta name="theme-color" content="#1494B5" />
```

## Regenerating

To regenerate the favicon:

```bash
node scripts/install-favicon.js
```

## Browser Support

- ✅ Chrome/Edge: SVG + PNG
- ✅ Firefox: SVG + PNG
- ✅ Safari: SVG + PNG
- ✅ iOS Safari: Apple Touch Icon
- ✅ Android Chrome: PNG + theme color

## Design Elements

- Rounded corners for modern look
- Medicine blister pack with pills
- Transparent pills showing through colored foil
- Subtle border and shadows for depth
- Optimized for small sizes (16x16 to 64x64px)
