"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface LogoContextValue {
  logo: string | null;
  fileName: string | null;
  error: string | null;
  setLogoFile: (file: File) => void;
  clearLogo: () => void;
}

const LogoContext = createContext<LogoContextValue | null>(null);

const STORAGE_KEY = "mg-merch-logo";
const STORAGE_NAME_KEY = "mg-merch-logo-name";
const MAX_BYTES = 3 * 1024 * 1024; // 3MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function LogoProvider({ children }: { children: ReactNode }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedLogo = window.localStorage.getItem(STORAGE_KEY);
      const storedName = window.localStorage.getItem(STORAGE_NAME_KEY);
      if (storedLogo) setLogo(storedLogo);
      if (storedName) setFileName(storedName);
    } catch {
      // Private browsing / storage disabled — logo just won't persist.
    }
  }, []);

  const setLogoFile = useCallback((file: File) => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please upload a PNG, JPG, WEBP, or SVG file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That file is too large — please upload something under 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogo(dataUrl);
      setFileName(file.name);
      try {
        window.localStorage.setItem(STORAGE_KEY, dataUrl);
        window.localStorage.setItem(STORAGE_NAME_KEY, file.name);
      } catch {
        // Storage full/disabled — logo still works for this page view.
      }
    };
    reader.onerror = () => setError("Couldn't read that file — please try again.");
    reader.readAsDataURL(file);
  }, []);

  const clearLogo = useCallback(() => {
    setLogo(null);
    setFileName(null);
    setError(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(STORAGE_NAME_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <LogoContext.Provider value={{ logo, fileName, error, setLogoFile, clearLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export function useLogo(): LogoContextValue {
  const ctx = useContext(LogoContext);
  if (!ctx) throw new Error("useLogo must be used within a LogoProvider");
  return ctx;
}

/**
 * Like useLogo, but returns null outside a LogoProvider instead of throwing.
 * The cart page uses it to offer the previewed logo as the file to attach,
 * without requiring the preview tool to be mounted around it.
 */
export function useOptionalLogo(): LogoContextValue | null {
  return useContext(LogoContext);
}
