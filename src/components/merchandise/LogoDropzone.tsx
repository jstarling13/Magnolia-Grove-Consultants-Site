"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useLogo } from "@/components/merchandise/LogoContext";

export default function LogoDropzone() {
  const { logo, fileName, error, setLogoFile, clearLogo } = useLogo();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
  }

  return (
    <div className="rounded-lg border border-gold/25 bg-cream-100/85 p-6 sm:p-8">
      <h2 className="text-lg text-onyx">See Your Logo On Our Products</h2>
      <p className="mt-1 text-sm text-onyx/60">
        Upload your logo and we&apos;ll preview it on every item below — no commitment, just a
        quick look at what your branded merchandise could look like.
      </p>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-6 py-8 text-center transition-colors ${
          isDragging ? "border-gold bg-gold/10" : "border-gold/40 hover:border-gold/70"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleChange}
          className="hidden"
        />
        {logo ? (
          <div className="flex flex-col items-center gap-3">
            {/* Preview thumbnail — a plain <img> since data URLs can't go through next/image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="Your uploaded logo" className="h-16 w-auto max-w-[160px] object-contain" />
            <p className="text-sm font-medium text-onyx">{fileName}</p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                clearLogo();
              }}
              className="text-xs font-semibold text-onyx/50 underline hover:text-red-500"
            >
              Remove logo
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-onyx">
              Drag & drop your logo here, or click to browse
            </p>
            <p className="mt-1 text-xs text-onyx/50">PNG, JPG, WEBP, or SVG — up to 3MB</p>
          </>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
