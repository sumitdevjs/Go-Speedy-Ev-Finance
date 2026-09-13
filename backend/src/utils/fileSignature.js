// Detects a file's real type from its magic bytes — a client can freely lie
// about Content-Type or extension, so that alone can't be trusted.
const SIGNATURES = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

function matchesSignature(buffer, bytes) {
  if (!buffer || buffer.length < bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[i] !== bytes[i]) return false;
  }
  return true;
}

function isWebp(buffer) {
  if (!buffer || buffer.length < 12) return false;
  return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
}

// Returns the verified mime type, or null if the content doesn't match any
// allowed format (SVG/HTML/executables included — never allowed here).
function detectFileType(buffer) {
  if (isWebp(buffer)) return 'image/webp';
  for (const sig of SIGNATURES) {
    if (matchesSignature(buffer, sig.bytes)) return sig.mime;
  }
  return null;
}

module.exports = { detectFileType };
