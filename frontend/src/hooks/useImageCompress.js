import { useState } from 'react';
import imageCompression from 'browser-image-compression';

export function useImageCompress() {
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState(null);

  const compress = async (file) => {
    if (!file) return null;
    
    if (file.type === 'application/pdf') {
      return {
        file,
        previewUrl: null,
      };
    }

    setCompressing(true);
    setError(null);

    const options = {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: 0.75,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const previewUrl = URL.createObjectURL(compressedFile);
      setCompressing(false);
      return {
        file: compressedFile,
        previewUrl,
      };
    } catch (err) {
      setCompressing(false);
      return {
        file,
        previewUrl: URL.createObjectURL(file),
      };
    }
  };

  return { compress, compressing, error };
}
