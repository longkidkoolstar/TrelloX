/**
 * Extracts the dominant color from an image URL
 * @param imageUrl URL of the image to analyze
 * @returns Promise that resolves to the dominant color in hex format (e.g., #RRGGBB)
 */
export const getDominantColor = (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      resolve('#026aa7'); // Default Trello-like blue if no image
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Enable CORS for the image

    img.onload = () => {
      try {
        // Create a canvas element to draw the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve('#026aa7'); // Fallback if canvas context is not available
          return;
        }

        // Set canvas size to a small sample (for performance)
        const size = 50;
        canvas.width = size;
        canvas.height = size;

        // Draw the image on the canvas, scaled down
        ctx.drawImage(img, 0, 0, size, size);

        // Get the pixel data
        const imageData = ctx.getImageData(0, 0, size, size).data;

        // Calculate the dominant color
        const colorCounts: Record<string, number> = {};
        let maxCount = 0;
        let dominantColor = '#026aa7'; // Default color

        // Process every 4th pixel for performance (RGBA values)
        for (let i = 0; i < imageData.length; i += 16) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          // Convert to hex and count occurrences
          const hex = rgbToHex(r, g, b);
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;

          if (colorCounts[hex] > maxCount) {
            maxCount = colorCounts[hex];
            dominantColor = hex;
          }
        }

        // Adjust the color to ensure it's dark enough for white text
        const adjustedColor = adjustColorForHeader(dominantColor);
        resolve(adjustedColor);
      } catch (error) {
        console.error('Error extracting dominant color:', error);
        resolve('#026aa7'); // Fallback to default color on error
      }
    };

    img.onerror = () => {
      console.error('Error loading image for color extraction');
      resolve('#026aa7'); // Fallback to default color on error
    };

    img.src = imageUrl;
  });
};

/**
 * Converts RGB values to a hex color string
 */
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

/**
 * Adjusts a color to ensure it's suitable for a header with white text
 * Darkens light colors to maintain contrast
 */
const adjustColorForHeader = (color: string): string => {
  // Convert hex to RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // Calculate perceived brightness (using the formula from W3C)
  // https://www.w3.org/TR/AERT/#color-contrast
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // If the color is too light, darken it
  if (brightness > 160) {
    // Darken the color by reducing each component
    const darkenFactor = 0.6; // Adjust this value to control darkness
    const newR = Math.floor(r * darkenFactor);
    const newG = Math.floor(g * darkenFactor);
    const newB = Math.floor(b * darkenFactor);

    return rgbToHex(newR, newG, newB);
  }

  return color;
};

/**
 * Darkens a color by a specified amount
 * @param color Hex color string (e.g., #RRGGBB)
 * @param amount Amount to darken (0-1, where 1 is black)
 * @returns Darkened color in hex format
 */
export const darkenColor = (color: string, amount: number = 0.15): string => {
  // Convert hex to RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // Darken each component
  const newR = Math.max(0, Math.floor(r * (1 - amount)));
  const newG = Math.max(0, Math.floor(g * (1 - amount)));
  const newB = Math.max(0, Math.floor(b * (1 - amount)));

  return rgbToHex(newR, newG, newB);
};
