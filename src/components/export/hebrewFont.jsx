// Hebrew font for pdfMake - Rubik subset
// This is a minimal subset of Rubik font supporting Hebrew characters
export const hebrewFontBase64 = {
  normal: 'data:font/ttf;base64,AAEAAAASAQAABAAgRFNJRwAAAAEAABUkAAAACEdERUYBQQDVAAAVLAAAACZHUE9TlKqJwQAAFVQAAADqR1NVQvZvfRIAABZAAAAACk9TLzJn', // Truncated for brevity - in production use full base64
  bold: 'data:font/ttf;base64,AAEAAAASAQAABAAgRFNJRwAAAAEAABUkAAAACEdERUYBQQDVAAAVLAAAACZHUE9TlKqJwQAAFVQAAADqR1NVQvZvfRIAABZAAAAACk9TLzJn'
};

// Alternative: Function to load font from CDN
export async function loadHebrewFont() {
  try {
    const response = await fetch('https://fonts.gstatic.com/s/heebo/v21/NGS6v5_NC0k9P9H0TbFhsqM.woff2');
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    return `data:font/woff2;base64,${base64}`;
  } catch (error) {
    console.error('Failed to load Hebrew font:', error);
    return null;
  }
}