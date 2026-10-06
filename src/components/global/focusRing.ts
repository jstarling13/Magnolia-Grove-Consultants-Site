/**
 * Visible keyboard focus for interactive elements, as Tailwind class strings.
 * Tailwind only sees complete class names, so these live as literals here and
 * are composed into className strings by the components.
 *
 * On light surfaces the ring is gold-text (5.7:1 on white, 4.7:1 on the
 * deepest cream tier); on the onyx bands it is gold-bright (11.4:1). Both
 * clear the 3:1 minimum for focus indicators.
 */
export const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-text";

export const FOCUS_RING_ON_DARK =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright";

/**
 * Text fields: the border is gold-text (at least 3:1 against the field and its
 * panel, WCAG 1.4.11) or red-700 when invalid, and the focus outline matches
 * everything else. The border color is chosen here rather than appended by the
 * caller, so two competing border-color utilities never end up on one element.
 */
export function fieldClasses(invalid = false): string {
  return `w-full rounded-md border bg-cream px-4 py-3 text-sm text-onyx placeholder:text-onyx/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-text ${
    invalid ? "border-red-700" : "border-gold-text/80"
  }`;
}
