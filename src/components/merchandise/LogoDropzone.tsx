"use client";

import { useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useLogo } from "@/components/merchandise/LogoContext";

/**
 * The drop zone is a plain container. Choosing a file is done by a real
 * <label> + visually hidden <input type="file"> (natively focusable and
 * operable with Enter or Space), and "Remove logo" is a sibling <button>, so
 * no interactive control sits inside another one.
 */
export default function LogoDropzone() {
  const { logo, fileName, error, setLogoFile, clearLogo } = useLogo();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) setLogoFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files);
    // Lets the same file be chosen again after a removal.
    event.target.value = "";
  }

  return (
    <div className="rounded-lg border border-gold/25 bg-cream-100/85 p-6 sm:p-8">
      <h2 className="text-lg text-onyx">See Your Logo On Our Products</h2>
      <p className="mt-1 text-sm text-onyx/60">
        Upload your logo and we&apos;ll preview it on every item below — no commitment, just a quick
        look at what your branded merchandise could look like.
      </p>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        data-testid="logo-dropzone"
        className={`mt-4 flex flex-col items-center justify-center rounded-md border-2 border-dashed text-center transition-colors focus-within:border-gold-dark focus-within:ring-2 focus-within:ring-gold-dark/40 ${
          isDragging ? "border-gold bg-gold/10" : "border-gold/40 hover:border-gold/70"
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleChange}
          aria-describedby={error ? errorId : undefined}
          className="sr-only"
        />
        {logo ? (
          <div className="flex flex-col items-center gap-3 px-6 py-8">
            {/* Preview thumbnail — a plain <img> since data URLs can't go through next/image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt="Your uploaded logo"
              className="h-16 w-auto max-w-[160px] object-contain"
            />
            <p className="text-sm font-medium text-onyx">{fileName}</p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <label
                htmlFor={inputId}
                className="cursor-pointer text-xs font-semibold text-onyx/60 underline hover:text-onyx"
              >
                Choose a different logo
              </label>
              <button
                type="button"
                onClick={() => {
                  clearLogo();
                  inputRef.current?.focus();
                }}
                className="text-xs font-semibold text-onyx/60 underline hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
              >
                Remove logo
              </button>
            </div>
          </div>
        ) : (
          <label htmlFor={inputId} className="block w-full cursor-pointer px-6 py-8">
            <span className="block text-sm font-semibold text-onyx">
              Drag & drop your logo here, or click to browse
            </span>
            <span className="mt-1 block text-xs text-onyx/60">
              PNG, JPG, WEBP, or SVG — up to 3MB
            </span>
          </label>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
