"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useOptionalLogo } from "@/components/merchandise/LogoContext";
import { FOCUS_RING } from "@/components/global/focusRing";
import { logoFileFromDataUrl } from "@/lib/logoFromPreview";
import {
  LOGO_ACCEPT,
  LOGO_TYPES_LABEL,
  MAX_LOGO_LABEL,
  checkLogoCandidate,
  formatFileSize,
} from "@/lib/orderLogo";

interface OrderLogoFieldProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

/**
 * Optional "Your logo" file input on the cart's request form. One file, chosen
 * or dragged in, with its name and size and a Remove button. When the shopper
 * already picked a logo in the preview tool, that same logo is attached here
 * automatically so they do not upload twice (they can still remove or replace
 * it). Only the name and size are checked in the browser; the server checks
 * the file's actual contents.
 *
 * The real <input type="file"> is visually hidden but focusable, with visible
 * <label>s as the click targets, so it works with a keyboard and screen reader.
 */
export default function OrderLogoField({ file, onFileChange }: OrderLogoFieldProps) {
  const preview = useOptionalLogo();
  const previewLogo = preview?.logo ?? null;
  const previewName = preview?.fileName ?? null;

  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [fromPreview, setFromPreview] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // The preview logo we have already offered, so removing it is not undone on the next render.
  const offered = useRef<string | null>(null);

  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  useEffect(() => {
    if (!previewLogo) {
      offered.current = null;
      return;
    }
    if (offered.current === previewLogo) return;
    offered.current = previewLogo;
    if (file) return; // the shopper already chose a file here
    const candidate = logoFileFromDataUrl(previewLogo, previewName);
    if (!candidate || checkLogoCandidate(candidate)) return;
    onFileChange(candidate);
    setFromPreview(true);
    setAnnouncement(`Your previewed logo, ${candidate.name}, will be attached to your request.`);
  }, [previewLogo, previewName, file, onFileChange]);

  function choose(candidate: File | undefined) {
    if (!candidate) return;
    const problem = checkLogoCandidate(candidate);
    if (problem) {
      setError(problem);
      setAnnouncement("");
      return;
    }
    setError("");
    setFromPreview(false);
    onFileChange(candidate);
    setAnnouncement(`Logo attached: ${candidate.name}, ${formatFileSize(candidate.size)}.`);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    choose(event.target.files?.[0]);
    // Lets the same file be chosen again after a removal.
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const files = event.dataTransfer.files;
    if (files && files.length > 1) {
      setError("Please attach one logo file. If you have more, reply to the confirmation email.");
      return;
    }
    choose(files?.[0]);
  }

  function remove() {
    onFileChange(null);
    setError("");
    setFromPreview(false);
    setAnnouncement("Logo removed. Your request will be sent without a logo.");
    inputRef.current?.focus();
  }

  return (
    <div className="sm:col-span-2">
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-onyx/80">
        Your logo (optional)
      </label>
      <p id={hintId} className="mb-2 text-xs text-onyx/60">
        One file: {LOGO_TYPES_LABEL}. Up to {MAX_LOGO_LABEL}.
      </p>

      <div
        data-testid="order-logo-dropzone"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`rounded-md border-2 border-dashed px-4 py-4 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-gold-text ${
          dragging ? "border-gold-text bg-gold/10" : "border-gold-text/60 bg-cream"
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          name="logo"
          type="file"
          accept={LOGO_ACCEPT}
          onChange={handleChange}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          className="sr-only"
        />
        {file ? (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <p className="break-all text-sm font-medium text-onyx">{file.name}</p>
              <p className="text-xs text-onyx/60">
                {formatFileSize(file.size)}
                {fromPreview ? ". This is the logo from your preview." : ""}
              </p>
            </div>
            <div className="flex items-center gap-x-4">
              <label
                htmlFor={inputId}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded text-sm font-semibold text-gold-text underline ${FOCUS_RING}`}
              >
                Choose a different file
              </label>
              <button
                type="button"
                onClick={remove}
                aria-label={`Remove ${file.name}`}
                className={`inline-flex min-h-11 items-center rounded px-2 text-sm font-semibold text-red-700 underline ${FOCUS_RING}`}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-onyx/80">
            <label
              htmlFor={inputId}
              className={`inline-flex min-h-11 cursor-pointer items-center rounded border border-gold-text px-4 py-2 font-semibold text-gold-text hover:bg-gold/10 ${FOCUS_RING}`}
            >
              Choose a file
            </label>
            <span className="ml-3">or drag it here</span>
          </div>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
