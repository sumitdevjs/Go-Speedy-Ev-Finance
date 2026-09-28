'use client';

import React from 'react';

/**
 * BrandLogo:
 * Renders the exact user-provided logo image (/logo-user-transparent.png)
 * and the company name underneath in Charis SIL font (.charis-sil-bold)
 */
export default function BrandLogo({
  size = 'nav', // 'nav' | 'lg' | 'sidebar' | 'compact'
  showText = true,
  theme = 'auto', // 'auto' | 'dark' | 'light'
  className = '',
}) {
  const isDark = theme === 'dark' || (theme === 'auto' && size === 'nav');

  const styles = {
    nav: {
      imgH: 'h-8 xxs:h-9 xs:h-10 sm:h-11 desk:h-12',
      text: 'text-xs xxs:text-[13px] sm:text-sm desk:text-[15px]',
      titleColor: isDark ? 'text-[#38bdf8]' : 'text-[#0f2b6e]',
      pvtColor: isDark ? 'text-[#4ade80]' : 'text-[#16a34a]',
    },
    lg: {
      imgH: 'h-11 xxs:h-13 sm:h-15 desk:h-16',
      text: 'text-sm xxs:text-base sm:text-lg desk:text-xl',
      titleColor: 'text-[#0f2b6e] dark:text-[#38bdf8]',
      pvtColor: 'text-[#16a34a] dark:text-[#4ade80]',
    },
    sidebar: {
      imgH: 'h-7 xs:h-8 sm:h-[34px]',
      text: 'text-[11px] xs:text-xs sm:text-[13px]',
      titleColor: 'text-[#0284c7] dark:text-[#38bdf8]',
      pvtColor: 'text-[#16a34a] dark:text-[#4ade80]',
    },
    compact: {
      imgH: 'h-6 sm:h-7',
      text: 'text-[10px] sm:text-[11px]',
      titleColor: 'text-[#0f2b6e] dark:text-[#38bdf8]',
      pvtColor: 'text-[#16a34a] dark:text-[#4ade80]',
    },
  }[size] || {
    imgH: 'h-8 xxs:h-9 xs:h-10 sm:h-11',
    text: 'text-xs xxs:text-[13px] sm:text-sm',
    titleColor: isDark ? 'text-[#38bdf8]' : 'text-[#0f2b6e]',
    pvtColor: isDark ? 'text-[#4ade80]' : 'text-[#16a34a]',
  };

  return (
    <div className={`inline-flex flex-col items-center justify-center select-none py-1 ${className}`}>
      {/* Exact User Uploaded Logo Image */}
      <img
        src="/logo-user-transparent.png"
        alt="Speedy GO EV | BSG Group"
        className={`${styles.imgH} w-auto object-contain shrink-0 drop-shadow-sm`}
      />

      {/* Subtitle Text in Charis SIL Font */}
      {showText && (
        <div
          className="charis-sil-bold mt-1 flex items-center justify-center gap-1.5 leading-tight text-center whitespace-nowrap px-1"
          style={{ fontFamily: '"Charis SIL", serif', fontWeight: 700, fontStyle: 'normal' }}
        >
          <span className={`${styles.text} ${styles.titleColor} drop-shadow-xs tracking-wider font-bold`}>
            Go Speedy EV
          </span>
          <span className={`${styles.text} ${styles.pvtColor} drop-shadow-xs tracking-wider font-bold`}>
            Pvt. Ltd.
          </span>
        </div>
      )}
    </div>
  );
}
