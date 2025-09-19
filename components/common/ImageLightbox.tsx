import React, { useEffect } from 'react';
import Icon, { XIcon } from './Icon';

interface ImageLightboxProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ imageUrl, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/50 hover:bg-black/75 transition-colors"
        aria-label="Close image view"
      >
        <Icon icon={XIcon} className="w-6 h-6" />
      </button>
      <div 
        className="relative max-w-full max-h-full" 
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
      >
        <img src={imageUrl} alt="Lightbox view" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
      </div>
    </div>
  );
};

export default ImageLightbox;
