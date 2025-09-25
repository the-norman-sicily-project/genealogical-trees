# Genealogical Trees - Deployment Package

This deployment package contains all files necessary to run the Norman Sicily Project Genealogical Tree visualization application.

## Package Contents

```
deploy/
├── index.html          # Main application page (5KB)
├── index.css           # Application styles (3KB)
├── index.js            # Main JavaScript logic (25KB)
├── translations.json   # UI translations for multiple languages (3KB)
├── data/
│   ├── nsp_people.json # Family tree data (8.4MB)
│   └── *.png           # Family photos (4.7MB total)
└── README.md           # This file
```

**Total Package Size:** 13MB

## Dependencies (CDN-Based)

The application uses modern CDN-hosted dependencies:
- jQuery 3.6.4
- jQuery UI 1.13.2
- Cytoscape.js 3.29.2
- Cytoscape extensions (fcose, panzoom, popper)
- Tippy.js 6.3.7
- Popper.js 2.11.8

## Deployment Options

### Option 1: Static Web Server
Upload all files to any static web server (Apache, Nginx, etc.):

```bash
# Upload entire deploy/ directory contents to your web root
rsync -av deploy/ user@server:/var/www/html/
```

### Option 2: Local Development Server
For testing/development:

```bash
# Python 3
python -m http.server 8000

# PHP
php -S localhost:8000

# Node.js (with http-server)
npx http-server
```

### Option 3: CDN/Cloud Hosting
Deploy to services like:
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront
- Azure Static Web Apps

## Requirements

### Browser Compatibility
- Modern browsers supporting ES6+ (Chrome 60+, Firefox 60+, Safari 12+)
- JavaScript enabled
- Internet connection (for CDN dependencies)

### Server Requirements
- **Minimal:** Any static file server
- **No server-side processing required**
- **No database required**

## Configuration

### Data File
- The application loads family data from `data/nsp_people.json`
- To use different family data, replace this file with your processed genealogical JSON

### Localization
- UI supports multiple languages via `translations.json`
- Set locale via URL parameter: `?locale=en` (default: English)

### Family Photos
- Photos stored in `data/*.png`
- Referenced in the JSON data by filename
- Optional: can remove photos to reduce package size by ~5MB

## URLs & Query Parameters

- **Main Application:** `/`
- **With Locale:** `/?locale=en`
- **Help & Documentation:** See original repository

## Security Notes

- All dependencies are loaded from reputable CDNs with integrity hashes
- No server-side execution required
- Safe for static hosting environments

## Troubleshooting

### Application Won't Load
1. Check browser console for errors
2. Verify internet connection (CDN dependencies)
3. Ensure all files are present and accessible
4. Check web server MIME types for `.json` files

### Performance Issues
- Large family trees (8MB+ data) may load slowly on mobile
- Consider reducing image sizes if bandwidth is limited
- Browser may pause during initial data processing

### Data Issues
- Verify `data/nsp_people.json` is valid JSON
- Check that referenced image files exist
- Ensure proper character encoding (UTF-8)

## Original Repository
For source code, data processing, and development:
https://github.com/[original-repo]

## Generated
This deployment package was created on $(date) with updated dependencies and comprehensive error handling.