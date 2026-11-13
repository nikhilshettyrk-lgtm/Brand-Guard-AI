/**
 * BrandGuard AI - Logo Asset Helper Utility
 * Safe validation, sanitization, and rasterization of PNG & SVG brand assets.
 */

export const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const DEFAULT_BRIGHTWAVE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120">
  <defs>
    <linearGradient id="bwGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00E5FF"/>
      <stop offset="100%" stop-color="#536DFE"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="none"/>
  <path d="M 30 75 C 45 35, 75 35, 90 75 C 105 35, 135 35, 150 75" fill="none" stroke="url(#bwGrad)" stroke-width="14" stroke-linecap="round"/>
  <circle cx="90" cy="30" r="9" fill="#00E5FF"/>
  <text x="175" y="65" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="34" fill="#202B45" letter-spacing="-0.5">BrightWave</text>
  <text x="175" y="92" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="15" fill="#536DFE" letter-spacing="3.5">ANALYTICS</text>
</svg>`;

export const DEFAULT_NORTHSTAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120">
  <defs>
    <linearGradient id="nsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#635BFF"/>
      <stop offset="100%" stop-color="#00D4B2"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="none"/>
  <g transform="translate(85, 60)">
    <polygon points="0,-45 10,-10 45,0 10,10 0,45 -10,10 -45,0 -10,-10" fill="url(#nsGrad)"/>
    <circle cx="0" cy="0" r="7" fill="#0A2540"/>
  </g>
  <text x="165" y="64" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="33" fill="#0A2540" letter-spacing="-0.5">Northstar</text>
  <text x="165" y="92" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="15" fill="#635BFF" letter-spacing="4">DIGITAL</text>
</svg>`;

export function svgToDataUrl(svgString) {
  const clean = svgString.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(clean)}`;
}

/**
 * Validates an uploaded logo file
 */
export function validateLogoFile(file) {
  if (!file) {
    throw new Error('No logo file provided.');
  }

  const name = file.name.toLowerCase();
  const ext = name.substring(name.lastIndexOf('.'));
  const validExtensions = ['.png', '.svg'];

  if (!validExtensions.includes(ext)) {
    throw new Error(`Unsupported logo format "${ext}". Please upload a PNG or SVG master logo.`);
  }

  if (file.size === 0) {
    throw new Error('The logo file is empty (0 bytes).');
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`Logo file size (${sizeMb} MB) exceeds the 5MB maximum limit.`);
  }

  return {
    extension: ext.replace('.', '').toUpperCase(),
    mimeType: ext === '.svg' ? 'image/svg+xml' : 'image/png'
  };
}

/**
 * Converts an SVG string or DataURL into a raster PNG DataURL using offscreen canvas.
 * Ensures compatibility with Gemini multimodal API which accepts PNG/JPEG/WEBP.
 */
export async function rasterizeSvgToPngDataUrl(svgSource, width = 512, height = 256) {
  if (typeof window === 'undefined') return null;

  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      let src = svgSource;
      if (!svgSource.startsWith('data:')) {
        src = svgToDataUrl(svgSource);
      }

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas 2D context unavailable'));
          }

          // Clear transparent
          ctx.clearRect(0, 0, width, height);

          // Calculate aspect-ratio fit
          const hRatio = width / (img.width || width);
          const vRatio = height / (img.height || height);
          const ratio = Math.min(hRatio, vRatio);
          const centerShiftX = (width - (img.width || width) * ratio) / 2;
          const centerShiftY = (height - (img.height || height) * ratio) / 2;

          ctx.drawImage(
            img,
            0,
            0,
            img.width || width,
            img.height || height,
            centerShiftX,
            centerShiftY,
            (img.width || width) * ratio,
            (img.height || height) * ratio
          );

          const pngDataUrl = canvas.toDataURL('image/png');
          resolve(pngDataUrl);
        } catch (canvasErr) {
          reject(canvasErr);
        }
      };

      img.onerror = (err) => {
        reject(new Error('Failed to load SVG for rasterization.'));
      };

      img.src = src;
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates initial default master logos for default organisations
 */
export function getDefaultLogoAssets() {
  const bwDataUrl = svgToDataUrl(DEFAULT_BRIGHTWAVE_SVG);
  const nsDataUrl = svgToDataUrl(DEFAULT_NORTHSTAR_SVG);

  return [
    {
      id: 'logo-brightwave-master',
      name: 'BrightWave Primary Horizontal Master',
      fileName: 'brightwave-master-logo.svg',
      fileType: 'SVG',
      variant: 'Primary Master',
      previewUrl: bwDataUrl,
      svgContent: DEFAULT_BRIGHTWAVE_SVG,
      organisation: 'BrightWave Analytics',
      isPrimary: true,
      fileSize: '1.2 KB',
      createdAt: 'Default Approved Asset',
      notes: 'Approved horizontal vector logo with wave mark and tech cobalt wordmark.'
    },
    {
      id: 'logo-northstar-master',
      name: 'Northstar Digital Master Star Emblem',
      fileName: 'northstar-digital-master.svg',
      fileType: 'SVG',
      variant: 'Primary Master',
      previewUrl: nsDataUrl,
      svgContent: DEFAULT_NORTHSTAR_SVG,
      organisation: 'Northstar Digital',
      isPrimary: true,
      fileSize: '1.4 KB',
      createdAt: 'Default Approved Asset',
      notes: 'Approved horizontal vector emblem lockup with compass star.'
    }
  ];
}
