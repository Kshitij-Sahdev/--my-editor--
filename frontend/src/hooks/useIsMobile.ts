/**
 * useIsMobile.ts - Hook to detect mobile/portrait orientation
 * 
 * Detects whether the device is in portrait mode or has a small screen width.
 * Used to switch between desktop (hover panels) and mobile (toggle buttons) layouts.
 */

import { useState, useEffect } from 'react';

/**
 * Media query for detecting mobile/portrait orientation.
 * Matches:
 * - Portrait orientation (height > width)
 * - OR screen width <= 768px (tablet/phone in landscape)
 */
const MOBILE_QUERY = '(orientation: portrait), (max-width: 768px)';

/**
 * Hook to detect if the device is in mobile/portrait mode.
 * Updates automatically when orientation or screen size changes.
 * 
 * @returns {boolean} true if mobile/portrait, false if desktop/landscape
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // SSR-safe: check if window exists
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    
    // Handler for media query changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Set initial value
    setIsMobile(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile;
}

export default useIsMobile;
