import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  darkSurface?: boolean;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
  darkSurface = false,
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`w-full h-full flex flex-col items-center justify-center p-6 text-center ${
          darkSurface
            ? 'bg-[#191B20] text-[#9CA3AF]'
            : 'bg-[#EEF0F3] text-[#5B616E]'
        } ${className}`}
      >
        <ImageOff className="w-7 h-7 mb-2 opacity-60" aria-hidden="true" />
        <p className="text-xs font-medium max-w-[200px] truncate">
          {fallbackTitle || alt || '이미지를 불러올 수 없습니다'}
        </p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
