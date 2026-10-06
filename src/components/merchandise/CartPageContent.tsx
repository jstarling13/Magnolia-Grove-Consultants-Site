"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCart, type CartLineItem, type LineDetails } from "@/components/merchandise/CartContext";
import { ColorDot } from "@/components/merchandise/ColorSwatches";
import { useCartProducts } from "@/hooks/useCartProducts";
import { useQuantityDraft } from "@/hooks/useQuantityDraft";
import {
  CART_CONTACT_FIELDS,
  CART_FORM_LIMITS,
  categoryTakesSizes,
  cleanLineDetail,
  fieldErrorsFromIssues,
  validateCartContact,
  type CartContactField,
  type CartFieldErrors,
} from "@/lib/cartFormRules";
import {
  ARTWORK_CONFIRMATION_PROMISE,
  ARTWORK_INSTRUCTIONS,
  cartContactEmail,
  cartSendFailureMessage,
  shopperErrorMessage,
} from "@/lib/cartShopperMessages";
import { cleanColorName } from "@/lib/colorSwatches";
import {
  cartLineKey,
  priceCart,
  resolveLineColor,
  type CartPricingProduct,
  type ProductPricingSummary,
} from "@/lib/cartPricing";
import {
  trackBeginCheckout,
  trackGenerateLead,
  trackRemoveFromCart,
  trackViewCart,
  type CartEventLine,
} from "@/lib/merchAnalytics";
import { formatPrice, isRealBrand, normalizeColors, type CartProduct } from "@/lib/merchCatalog";
import Turnstile from "@/components/Turnstile";
import { FOCUS_RING, FOCUS_RING_ON_DARK, fieldClasses } from "@/components/global/focusRing";

interface ContactFields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  company_website: string;
}

const initialFields: ContactFields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
  company_website: "",
};

// Shown for network failures and any server fault. Never a server-supplied
// reason: configuration problems are for the server log, not the shopper.
const DEFAULT_ERROR = cartSendFailureMessage();
const FIELD_ERRORS_SUMMARY = "Please fix the highlighted fields and submit again.";

type Status = "idle" | "submitting" | "success" | "error";

interface DisplayLine {
  item: CartLineItem;
  unitPrice: number;
  lineTotal: number;
  /** The line's color when it is one the product really offers; otherwise undefined. */
  color: string | undefined;
  /** Product has colors but this line has none we can submit (legacy or stale). */
  needsColor: boolean;
  /** Set when a color-less legacy line belongs to a one-color product: that color is the only choice. */
  soleColor: string | undefined;
}

interface ProductGroup {
  product: CartProduct;
  summary: ProductPricingSummary;
  lines: DisplayLine[];
}

function productHref(productId: string, color: string | undefined): string {
  return `/merchandise/${productId}${color ? `?color=${encodeURIComponent(color)}` : ""}`;
}

function lineThumbnail(product: CartProduct, color: string | undefined): string | undefined {
  return (color ? product.colorImages?.[color] : undefined) ?? product.image;
}

interface CartPageContentProps {
  /**
   * Products already in hand (tests, previews). Leave it out on the real page:
   * the cart then fetches only the products in the shopper's saved cart.
   */
  catalog?: CartProduct[];
  /** Disclaimer copy from the config, passed in so this client bundle never imports the full catalog config. */
  pricingDisclaimer: string;
  deliveryEstimate: string;
}

export default function CartPageContent({
  catalog,
  pricingDisclaimer,
  deliveryEstimate,
}: CartPageContentProps) {
  const {
    items,
    hydrated,
    updateQuantity,
    removeItem,
    changeColor,
    setLineDetails,
    clear,
    removeProducts,
    removedUnavailableCount,
  } = useCart();
  const [fields, setFields] = useState<ContactFields>(initialFields);
  const [errors, setErrors] = useState<CartFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [submitError, setSubmitError] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [confirmationEmailed, setConfirmationEmailed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const errorBannerRef = useRef<HTMLParagraphElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  // Fetch just the products this cart holds (nothing until the saved cart has loaded).
  const cartProductIds = useMemo(
    () => (hydrated ? Array.from(new Set(items.map((item) => item.productId))) : []),
    [hydrated, items]
  );
  const loaded = useCartProducts(cartProductIds, catalog);
  const productsById = loaded.products;

  // Products the server says are gone: drop their lines; the notice below says so.
  const missingIds = loaded.missingIds;
  useEffect(() => {
    if (missingIds.length > 0) removeProducts(missingIds);
  }, [missingIds, removeProducts]);
  const settlingRemovals = items.some((item) => missingIds.includes(item.productId));

  const cart = useMemo(
    () => priceCart(items, (id): CartPricingProduct | undefined => productsById.get(id)),
    [items, productsById]
  );

  // Lines grouped by product (in order of first appearance) so every color of
  // one product sits together under its shared volume price.
  const groups = useMemo(() => {
    const summaries = new Map(cart.products.map((summary) => [summary.productId, summary]));
    const byProduct = new Map<string, ProductGroup>();
    for (const priced of cart.lines) {
      const product = productsById.get(priced.line.productId)!;
      const colorState = resolveLineColor(product, priced.line.color);
      const colorOptions = normalizeColors(product.colors);
      // A legacy color-less line of a one-color product has nothing to choose:
      // use that color instead of asking.
      const soleColor =
        colorState.kind === "missing" && colorOptions.length === 1 ? colorOptions[0] : undefined;
      const line: DisplayLine = {
        item: priced.line,
        unitPrice: priced.unitPrice,
        lineTotal: priced.lineTotal,
        // A legacy or stale color isn't something we can submit; the shopper
        // has to choose one of the product's real colors.
        color: colorState.kind === "ok" ? colorState.color : soleColor,
        needsColor:
          !soleColor &&
          (colorState.kind === "missing" ||
            (colorState.kind === "invalid" && colorOptions.length > 0)),
        soleColor,
      };
      const group = byProduct.get(product.id);
      if (group) group.lines.push(line);
      else
        byProduct.set(product.id, { product, summary: summaries.get(product.id)!, lines: [line] });
    }
    return Array.from(byProduct.values());
  }, [cart, productsById]);

  const lines = useMemo(() => groups.flatMap((group) => group.lines), [groups]);
  const unitCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.item.quantity, 0),
    [lines]
  );
  const subtotal = cart.subtotal;
  const eventLines = useMemo<CartEventLine[]>(
    () =>
      groups.flatMap((group) =>
        group.lines.map((line) => ({
          product: group.product,
          color: line.color,
          quantity: line.item.quantity,
          unitPrice: line.unitPrice,
        }))
      ),
    [groups]
  );

  // Save the auto-selected color into the cart so the stored line is complete
  // (and merges into an existing line of that color, if there is one).
  useEffect(() => {
    for (const group of groups) {
      for (const line of group.lines) {
        if (line.soleColor && line.item.color === undefined) {
          changeColor(group.product.id, undefined, line.soleColor);
        }
      }
    }
  }, [groups, changeColor]);

  const viewedCart = useRef(false);
  const startedCheckout = useRef(false);

  // The cart loads from localStorage after mount, so wait for the first non-empty cart.
  useEffect(() => {
    if (viewedCart.current || eventLines.length === 0) return;
    viewedCart.current = true;
    trackViewCart(eventLines, subtotal);
  }, [eventLines, subtotal]);

  function handleFormFocus() {
    if (startedCheckout.current) return;
    startedCheckout.current = true;
    trackBeginCheckout(eventLines, subtotal);
  }

  function handleRemove(productId: string, color?: string) {
    const group = groups.find((entry) => entry.product.id === productId);
    const line = group?.lines.find((entry) => entry.item.color === color);
    if (group && line) {
      trackRemoveFromCart({
        product: group.product,
        color: line.color,
        quantity: line.item.quantity,
        unitPrice: line.unitPrice,
      });
    }
    removeItem(productId, color);
  }
  const belowMinimumGroups = groups.filter((group) => group.summary.belowMinimum);
  const linesNeedingColor = lines.filter((line) => line.needsColor);
  const blockedReason =
    linesNeedingColor.length > 0
      ? "Choose a color for each item above before submitting."
      : belowMinimumGroups.length > 0
        ? "Raise the quantity of the items marked above to their minimum order before submitting."
        : "";

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  // A failed submit with no field to blame (server, network, minimums): move focus to the message.
  const hasFieldErrors = Object.values(errors).some(Boolean);
  useEffect(() => {
    if (status === "error" && !hasFieldErrors) errorBannerRef.current?.focus();
  }, [status, submitError, hasFieldErrors]);

  // Success swaps the whole page content, which drops keyboard focus: put it on the confirmation.
  useEffect(() => {
    if (status === "success") successHeadingRef.current?.focus();
  }, [status]);

  /** Puts the cursor in the first field that has an error, in form order. */
  function focusFirstInvalid(fieldErrors: CartFieldErrors) {
    const first = CART_CONTACT_FIELDS.find((name) => fieldErrors[name]);
    if (first) document.getElementById(first)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateCartContact(fields);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      focusFirstInvalid(validationErrors);
      return;
    }

    setStatus("submitting");
    setSubmitError("");

    try {
      const response = await fetch("/api/merchant/cart-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          turnstileToken,
          items: lines.map((line) => ({
            productId: line.item.productId,
            ...(line.color ? { color: line.color } : {}),
            quantity: line.item.quantity,
            ...(cleanLineDetail(line.item.sizes)
              ? { sizes: cleanLineDetail(line.item.sizes) }
              : {}),
            ...(cleanLineDetail(line.item.imprintNotes)
              ? { imprintNotes: cleanLineDetail(line.item.imprintNotes) }
              : {}),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // A 400 from schema validation carries per-field messages: show them on
        // the fields instead of the generic "Validation failed.".
        const server = fieldErrorsFromIssues(data.issues);
        const hasFieldErrors = Object.keys(server.fields).length > 0;
        if (hasFieldErrors) setErrors(server.fields);
        setSubmitError(
          hasFieldErrors
            ? server.other
              ? `${FIELD_ERRORS_SUMMARY} ${server.other}`
              : FIELD_ERRORS_SUMMARY
            : server.other || shopperErrorMessage(response.status, data.error)
        );
        setStatus("error");
        if (hasFieldErrors) focusFirstInvalid(server.fields);
        return;
      }

      setOrderRef(typeof data.orderRef === "string" ? data.orderRef : "");
      setConfirmationEmailed(data.confirmationEmailed === true);
      setStatus("success");
      trackGenerateLead(eventLines, subtotal);
      clear();
      setFields(initialFields);
    } catch {
      setSubmitError(DEFAULT_ERROR);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <section className="bg-cream px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div
          role="status"
          className="mx-auto flex max-w-2xl flex-col items-center rounded-lg border border-gold/25 bg-cream-100/85 px-8 py-16 text-center"
        >
          <h1
            ref={successHeadingRef}
            tabIndex={-1}
            className="text-2xl text-onyx focus:outline-none"
          >
            Order Request Received
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-onyx/60">
            Nothing has been charged. We&apos;ll email you a final quote covering decoration,
            shipping, and tax, with a secure link to pay. We place the order once your payment
            clears.
          </p>
          {orderRef && (
            <p className="mt-6 text-sm text-onyx/80">
              Your order reference is <span className="font-semibold text-onyx">{orderRef}</span>.
              {confirmationEmailed
                ? " We've emailed you a confirmation with the details."
                : " Keep it handy if you contact us."}
            </p>
          )}
          <p className="mt-4 max-w-md text-sm leading-relaxed text-onyx/80">
            {confirmationEmailed ? (
              ARTWORK_INSTRUCTIONS
            ) : (
              <>
                Send your logo files (vector PDF, AI, EPS or PNG) to {cartContactEmail() ?? "us"}
                {orderRef ? ` and mention ${orderRef}` : ""}.
              </>
            )}{" "}
            {ARTWORK_CONFIRMATION_PROMISE}
          </p>
          <Link
            href="/merchandise"
            className={`mt-8 inline-flex min-h-11 items-center rounded-md border border-gold-text px-6 py-3 text-sm font-semibold text-gold-text transition-colors hover:bg-gold/10 ${FOCUS_RING}`}
          >
            Back to Merchandise
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-onyx px-6 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/merchandise"
            className={`inline-flex min-h-11 items-center rounded text-sm font-semibold text-muted-light transition-colors hover:text-gold-bright ${FOCUS_RING_ON_DARK}`}
          >
            ← Back to Merchandise
          </Link>
          <h1 className="mt-1 text-4xl uppercase text-white sm:text-5xl">Your Cart</h1>
        </div>
      </section>

      <section className="bg-cream px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-4xl">
          {removedUnavailableCount > 0 && (
            <p
              role="status"
              className="mb-6 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-onyx"
            >
              {removedUnavailableCount === 1
                ? "An item in your cart is no longer available and was removed."
                : `${removedUnavailableCount} items in your cart are no longer available and were removed.`}
            </p>
          )}
          {!hydrated || (items.length > 0 && (loaded.status === "loading" || settlingRemovals)) ? (
            <CartSkeleton />
          ) : loaded.status === "error" ? (
            <div
              role="alert"
              className="rounded-lg border border-gold/25 bg-cream-100/85 px-8 py-12 text-center"
            >
              <p className="text-base text-onyx/80">
                We couldn&apos;t load your cart items. Your cart is saved; check your connection and
                try again.
              </p>
              <button
                type="button"
                onClick={loaded.retry}
                className={`mt-6 inline-flex min-h-11 items-center rounded-md bg-gold px-6 py-3 text-sm font-semibold text-onyx transition-colors hover:bg-gold-bright ${FOCUS_RING}`}
              >
                Try again
              </button>
            </div>
          ) : lines.length === 0 ? (
            <div className="rounded-lg border border-gold/25 bg-cream-100/85 px-8 py-16 text-center">
              <p className="text-base text-onyx/60">Your cart is empty.</p>
              <Link
                href="/merchandise"
                className={`mt-6 inline-flex min-h-11 items-center rounded-md bg-gold px-6 py-3 text-sm font-semibold text-onyx transition-colors hover:bg-gold-bright ${FOCUS_RING}`}
              >
                Browse Merchandise
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-4">
                {groups.map((group) => (
                  <li key={group.product.id}>
                    <CartProductGroup
                      group={group}
                      onQuantity={updateQuantity}
                      onRemove={handleRemove}
                      onChooseColor={changeColor}
                      onDetails={setLineDetails}
                    />
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-lg border border-gold/25 bg-cream-100/85 px-6 py-5">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-onyx/60">
                      Estimated Subtotal
                    </p>
                    <p className="mt-0.5 text-xs text-onyx/60">
                      {lines.length} {lines.length === 1 ? "item" : "items"}, {unitCount}{" "}
                      {unitCount === 1 ? "unit" : "units"}
                    </p>
                  </div>
                  <p
                    aria-live="polite"
                    aria-atomic="true"
                    className="font-heading text-3xl font-bold tabular-nums text-onyx"
                  >
                    {formatPrice(subtotal)}
                  </p>
                </div>
                <div className="mt-4 space-y-1 border-t border-gold/15 pt-4 text-xs leading-relaxed text-onyx/60">
                  <p>{pricingDisclaimer}</p>
                  <p>{deliveryEstimate}</p>
                </div>
              </div>

              <form
                noValidate
                onSubmit={handleSubmit}
                onFocus={handleFormFocus}
                className="relative mt-10 rounded-lg border border-gold/25 bg-cream-100/85 p-6 sm:p-10"
              >
                <h2 className="text-xl text-onyx">Submit Your Order Request</h2>
                <p className="mt-2 text-sm text-onyx/60">
                  Nothing is charged yet. We&apos;ll email you a final quote with a secure payment
                  link, and place the order once you&apos;ve paid.
                </p>
                <p className="mt-2 text-sm text-onyx/60">
                  {ARTWORK_INSTRUCTIONS} {ARTWORK_CONFIRMATION_PROMISE}
                </p>

                <input
                  type="text"
                  name="company_website"
                  value={fields.company_website}
                  onChange={handleChange}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute left-[-9999px] h-0 w-0 opacity-0"
                />

                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="mb-2 block text-sm font-medium text-onyx/80"
                    >
                      First Name
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      value={fields.firstName}
                      onChange={handleChange}
                      required
                      aria-invalid={Boolean(errors.firstName)}
                      aria-describedby={errors.firstName ? "firstName-error" : undefined}
                      className={fieldClasses(Boolean(errors.firstName))}
                    />
                    {errors.firstName && (
                      <p id="firstName-error" role="alert" className="mt-1.5 text-xs text-red-700">
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="mb-2 block text-sm font-medium text-onyx/80"
                    >
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      value={fields.lastName}
                      onChange={handleChange}
                      required
                      aria-invalid={Boolean(errors.lastName)}
                      aria-describedby={errors.lastName ? "lastName-error" : undefined}
                      className={fieldClasses(Boolean(errors.lastName))}
                    />
                    {errors.lastName && (
                      <p id="lastName-error" role="alert" className="mt-1.5 text-xs text-red-700">
                        {errors.lastName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-onyx/80">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={fields.email}
                      onChange={handleChange}
                      required
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "email-error" : undefined}
                      className={fieldClasses(Boolean(errors.email))}
                    />
                    {errors.email && (
                      <p id="email-error" role="alert" className="mt-1.5 text-xs text-red-700">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="mb-2 block text-sm font-medium text-onyx/80">
                      Phone
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={fields.phone}
                      onChange={handleChange}
                      required
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? "phone-error" : undefined}
                      className={fieldClasses(Boolean(errors.phone))}
                    />
                    {errors.phone && (
                      <p id="phone-error" role="alert" className="mt-1.5 text-xs text-red-700">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="notes" className="mb-2 block text-sm font-medium text-onyx/80">
                      Anything Else?
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      value={fields.notes}
                      onChange={handleChange}
                      placeholder="Colors, branding details, deadline, etc."
                      aria-invalid={Boolean(errors.notes)}
                      aria-describedby={errors.notes ? "notes-error" : undefined}
                      className={`${fieldClasses(Boolean(errors.notes))} resize-none`}
                    />
                    {errors.notes && (
                      <p id="notes-error" role="alert" className="mt-1.5 text-xs text-red-700">
                        {errors.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <Turnstile onToken={setTurnstileToken} />
                </div>

                {status === "error" && (
                  <p
                    ref={errorBannerRef}
                    tabIndex={-1}
                    role="alert"
                    className="mt-6 rounded-md border border-red-700/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-text"
                  >
                    {submitError || DEFAULT_ERROR}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "submitting" || blockedReason !== ""}
                  aria-describedby={blockedReason ? "submit-blocked" : undefined}
                  className={`mt-8 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-gold px-6 py-4 text-sm font-semibold text-onyx transition-all hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto ${FOCUS_RING}`}
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2
                        size={18}
                        aria-hidden="true"
                        className="animate-spin motion-reduce:animate-none"
                      />
                      Submitting...
                    </>
                  ) : (
                    "Submit Order Request"
                  )}
                </button>
                <p role="status" className="sr-only">
                  {status === "submitting" ? "Submitting your order request." : ""}
                </p>
                {blockedReason && (
                  <p id="submit-blocked" className="mt-3 text-sm text-red-700">
                    {blockedReason}
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      </section>
    </>
  );
}

function CartSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">Loading your cart</span>
      {[0, 1].map((row) => (
        <div
          key={row}
          className="flex items-center gap-4 rounded-lg border border-gold/25 bg-cream-100/85 p-4 sm:gap-5 sm:p-6"
        >
          <div className="h-20 w-20 shrink-0 animate-pulse rounded-md bg-cream motion-reduce:animate-none sm:h-24 sm:w-24" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-cream motion-reduce:animate-none" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-cream motion-reduce:animate-none" />
            <div className="h-8 w-24 animate-pulse rounded bg-cream motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CartProductGroup({
  group,
  onQuantity,
  onRemove,
  onChooseColor,
  onDetails,
}: {
  group: ProductGroup;
  onQuantity: (productId: string, quantity: number, color?: string) => void;
  onRemove: (productId: string, color?: string) => void;
  onChooseColor: (productId: string, fromColor: string | undefined, toColor: string) => void;
  onDetails: (productId: string, color: string | undefined, details: LineDetails) => void;
}) {
  const { product, summary, lines } = group;
  const colorOptions = normalizeColors(product.colors);

  return (
    <div className="rounded-lg border border-gold/25 bg-cream-100/85">
      <ul className="divide-y divide-gold/15">
        {lines.map((line) => (
          <CartLine
            key={cartLineKey(line.item.productId, line.item.color)}
            product={product}
            line={line}
            colorOptions={colorOptions}
            onQuantity={onQuantity}
            onRemove={onRemove}
            onChooseColor={onChooseColor}
            onDetails={onDetails}
          />
        ))}
      </ul>

      {(lines.length > 1 || summary.belowMinimum) && (
        <div className="space-y-1 border-t border-gold/15 px-4 py-3 text-xs sm:px-6">
          {lines.length > 1 && (
            <p className="text-onyx/60">Volume pricing applies across colors.</p>
          )}
          {summary.belowMinimum && (
            <p role="alert" className="font-semibold text-red-700">
              Minimum order is {summary.minimum} units. You have {summary.totalQuantity}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CartLine({
  product,
  line,
  colorOptions,
  onQuantity,
  onRemove,
  onChooseColor,
  onDetails,
}: {
  product: CartProduct;
  line: DisplayLine;
  colorOptions: string[];
  onQuantity: (productId: string, quantity: number, color?: string) => void;
  onRemove: (productId: string, color?: string) => void;
  onChooseColor: (productId: string, fromColor: string | undefined, toColor: string) => void;
  onDetails: (productId: string, color: string | undefined, details: LineDetails) => void;
}) {
  const selectId = useId();
  const { item } = line;
  const quantity = useQuantityDraft({
    value: item.quantity,
    onCommit: (next) => onQuantity(item.productId, next, item.color),
  });
  const href = productHref(product.id, line.color);
  const thumbnail = lineThumbnail(product, line.color);
  const colorLabel = line.color ? cleanColorName(line.color) : undefined;
  const lineName = colorLabel ? `${product.name}, ${colorLabel}` : product.name;

  return (
    <li className="flex items-start gap-4 p-4 sm:items-center sm:gap-5 sm:p-6">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-md border border-gold/15 bg-cream sm:h-24 sm:w-24"
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="96px"
            className="object-contain object-center p-1.5"
          />
        ) : null}
      </Link>

      <div className="min-w-0 flex-1">
        {isRealBrand(product.brand) && (
          <p className="truncate text-[11px] font-semibold uppercase leading-4 tracking-wide text-gold-text">
            {product.brand}
          </p>
        )}
        <Link
          href={href}
          className={`line-clamp-3 rounded text-sm font-semibold leading-snug text-onyx hover:text-gold-text sm:line-clamp-2 ${FOCUS_RING}`}
        >
          {product.name}
        </Link>

        {line.color ? (
          <p className="mt-1 flex items-center gap-2 text-xs text-onyx/70">
            <ColorDot color={line.color} />
            <span>
              <span className="text-onyx/60">Color: </span>
              {colorLabel}
            </span>
          </p>
        ) : line.needsColor ? (
          <div className="mt-2">
            <label htmlFor={selectId} className="block text-xs font-semibold text-red-700">
              Choose a color
            </label>
            <select
              id={selectId}
              value=""
              onChange={(event) => {
                if (event.target.value)
                  onChooseColor(item.productId, item.color, event.target.value);
              }}
              className={`mt-1 min-h-11 w-full max-w-[14rem] rounded-md border border-red-700 bg-cream px-2 py-1.5 text-sm text-onyx ${FOCUS_RING}`}
            >
              <option value="" disabled>
                Select a color
              </option>
              {colorOptions.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <p className="mt-1 text-xs text-onyx/60">{formatPrice(line.unitPrice)} per unit</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-onyx/60">
            Qty
            <input
              {...quantity.inputProps}
              type="number"
              inputMode="numeric"
              min={1}
              aria-label={`Quantity for ${lineName}`}
              aria-invalid={Boolean(quantity.message)}
              aria-describedby={quantity.message ? quantity.messageId : undefined}
              className={`min-h-11 w-24 rounded-md border border-gold-text/80 bg-cream px-2 py-1.5 text-sm text-onyx ${FOCUS_RING}`}
            />
          </label>
          <button
            type="button"
            onClick={() => onRemove(item.productId, item.color)}
            aria-label={`Remove ${lineName}`}
            className={`inline-flex min-h-11 items-center rounded px-2 text-sm font-semibold text-onyx/60 underline hover:text-red-700 ${FOCUS_RING}`}
          >
            Remove
          </button>
        </div>
        {quantity.message && (
          <p
            id={quantity.messageId}
            role="alert"
            className="mt-2 text-xs font-semibold text-red-700"
          >
            {quantity.message}
          </p>
        )}
        <LineDetailsFields
          item={item}
          takesSizes={categoryTakesSizes(product.category)}
          lineName={lineName}
          onDetails={onDetails}
        />
      </div>

      <div className="shrink-0 text-right font-heading text-lg font-bold tabular-nums text-onyx">
        {formatPrice(line.lineTotal)}
      </div>
    </li>
  );
}

/**
 * Optional per-line text: a size breakdown (apparel and headwear only) and
 * imprint notes (every product). Collapsed unless the line already has some,
 * so the cart stays light. Edits save straight into the cart.
 */
function LineDetailsFields({
  item,
  takesSizes,
  lineName,
  onDetails,
}: {
  item: CartLineItem;
  takesSizes: boolean;
  lineName: string;
  onDetails: (productId: string, color: string | undefined, details: LineDetails) => void;
}) {
  const baseId = useId();
  const [open, setOpen] = useState(Boolean(item.sizes || item.imprintNotes));
  const toggleLabel = takesSizes ? "Add sizes or imprint notes" : "Add imprint notes";
  const max = CART_FORM_LIMITS.lineDetailMax;

  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${baseId}-panel`}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex min-h-11 items-center rounded px-2 text-sm font-semibold text-gold-text underline ${FOCUS_RING}`}
      >
        {open ? "Hide sizes and imprint notes" : toggleLabel}
        <span className="sr-only"> for {lineName}</span>
      </button>
      <div id={`${baseId}-panel`} hidden={!open} className="mt-1 space-y-3">
        {takesSizes && (
          <div>
            <label htmlFor={`${baseId}-sizes`} className="block text-xs font-semibold text-onyx/80">
              Sizes and quantities <span className="font-normal text-onyx/60">(optional)</span>
            </label>
            <textarea
              id={`${baseId}-sizes`}
              rows={2}
              maxLength={max}
              value={item.sizes ?? ""}
              onChange={(event) =>
                onDetails(item.productId, item.color, { sizes: event.target.value })
              }
              placeholder="24 M, 60 L, 60 XL"
              aria-describedby={`${baseId}-sizes-help`}
              className={`${fieldClasses(false)} mt-1 resize-none px-3 py-2`}
            />
            <p id={`${baseId}-sizes-help`} className="mt-1 text-xs text-onyx/60">
              How many of each size, so the quote and order match what you need.
            </p>
          </div>
        )}
        <div>
          <label htmlFor={`${baseId}-imprint`} className="block text-xs font-semibold text-onyx/80">
            Imprint notes <span className="font-normal text-onyx/60">(optional)</span>
          </label>
          <textarea
            id={`${baseId}-imprint`}
            rows={2}
            maxLength={max}
            value={item.imprintNotes ?? ""}
            onChange={(event) =>
              onDetails(item.productId, item.color, { imprintNotes: event.target.value })
            }
            placeholder="Left chest, white ink"
            aria-describedby={`${baseId}-imprint-help`}
            className={`${fieldClasses(false)} mt-1 resize-none px-3 py-2`}
          />
          <p id={`${baseId}-imprint-help`} className="mt-1 text-xs text-onyx/60">
            Where the logo goes and the ink color.
          </p>
        </div>
      </div>
    </div>
  );
}
