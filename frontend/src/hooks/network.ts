/**
 * network.ts - Network status detection hook
 *
 * Provides real-time network connectivity awareness:
 * - Detects browser online/offline status via navigator.onLine
 * - Polls backend health endpoint to verify actual connectivity
 * - Exposes isOnline, isBackendHealthy, and combined isConnected status
 */

import { useState, useEffect, useCallback } from "react";

/** Backend API URL - use relative path for production */
const API_URL = import.meta.env.VITE_API_URL || "";

/** How often to poll the health endpoint (ms) */
const HEALTH_POLL_INTERVAL = 10000;

/** Timeout for health check requests (ms) */
const HEALTH_CHECK_TIMEOUT = 3000;

export interface NetworkStatus {
  /** Browser reports online status */
  isOnline: boolean;
  /** Backend health check passed */
  isBackendHealthy: boolean;
  /** Combined: both online and backend healthy */
  isConnected: boolean;
  /** Last time health was checked */
  lastChecked: number | null;
  /** Force a health check now */
  checkHealth: () => Promise<boolean>;
}

/**
 * Hook to monitor network connectivity and backend availability.
 * 
 * @returns NetworkStatus object with connectivity state and check function
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  /**
   * Check if the backend is reachable and healthy.
   * Uses a simple GET to /api/health with a timeout.
   */
  const checkHealth = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setIsBackendHealthy(false);
      setLastChecked(Date.now());
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

      const response = await fetch(`${API_URL}/api/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const healthy = response.ok;
      setIsBackendHealthy(healthy);
      setLastChecked(Date.now());
      return healthy;
    } catch {
      // Network error, timeout, or aborted
      setIsBackendHealthy(false);
      setLastChecked(Date.now());
      return false;
    }
  }, []);

  // Listen for browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Immediately check health when coming back online
      checkHealth();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsBackendHealthy(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial health check
    checkHealth();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkHealth]);

  // Poll health endpoint periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        checkHealth();
      }
    }, HEALTH_POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [checkHealth]);

  return {
    isOnline,
    isBackendHealthy,
    isConnected: isOnline && isBackendHealthy,
    lastChecked,
    checkHealth,
  };
}
