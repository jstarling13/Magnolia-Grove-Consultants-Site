"use client";

import { useId, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCart, type CartLineItem } from "@/components/merchandise/CartContext";
import { ColorDot } from "@/components/merchandise/ColorSwatches";
import { cleanColorName } from "@/lib/colorSwatches";
import {
  cartLineKey,
  priceCart,
  resolveLineColor,
  type CartPricingProduct,
  type ProductPricingSummary,
} from "@/lib/cartPricing";
import { formatPrice, isRealBrand, normalizeColors, type CatalogProduct } from "@/lib/merchCatalog";
import Turnstile from "@/components/Turnstile";

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_ERROR =
  "Something went wrong. Please double-check your info or email ben@magnoliagrovega.com.";

function validate(fields: ContactFields): Partial<Record<keyof ContactFields, string>> {
  const errors: Partial<Record<keyof ContactFields, string>> = {};
  if (!fields.firstName.trim()) errors.firstName = "First name is required.";
  if (!fields.lastName.trim()) errors.lastName = "Last name is required.";
  if (!fields.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(fields.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!fields.phone.trim()) errors.phone = "Phone number is required.";
  return errors;
}

const inputClasses =
  "w-full rounded-md border border-gold/25 bg-cream px-4 py-3 text-sm text-onyx placeholder:text-onyx/50 focus:outline-none focus:ring-2 focus:ring-gold/60 transition-colors";

type Status = "idle" | "submitting" | "success" | "error";

interface DisplayLine {
  item: CartLineItem;
  unitPrice: number;
  lineTotal: number;
  /** The line's color when it is one the product really offers; otherwise undefined. */
  color: string | undefined;
  /** Product has colors but this line has none we can submit (legacy or stale). */
  needsColor: boolean;
}

interface ProductGroup {
  product: CatalogProduct;
  summary: ProductPricingSummary;
  lines: DisplayLine[];
}

function productHref(productId: string, color: string | undefined): string {
  return `/merchandise/${productId}${color ? `?color=${encodeURIComponent(color)}` : ""}`;
}

function lineThumbnail(product: CatalogProduct, color: string | undefined): string | undefined {
  return (color ? product.colorImages?.[color] : undefined) ?? product.image;
}

interface CartPageContentProps {
  catalog: CatalogProduct[];
  /** Disclaimer copy from the config, passed in so this client bundle never imports the full catalog config. */
  pricingDisclaimer: string;
  deliveryEstimate: string;
}

export default function CartPageContent({
  catalog,
  pricingDisclaimer,
  deliveryEstimate,
}: CartPageContentProps) {
  const { items, updateQuantity, removeItem, changeColor, clear } = useCart();
  const [fields, setFields] = useState<ContactFields>(initialFields);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFields, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [submitError, setSubmitError] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [confirmationEmailed, setConfirmationEmailed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  const productsById = useMemo(
    () => new Map(catalog.map((product) => [product.id, product])),
    [catalog]
  );

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
      const line: DisplayLine = {
        item: priced.line,
        unitPrice: priced.unitPrice,
        lineTotal: priced.lineTotal,
        // A legacy or stale color isn't something we can submit; the shopper
        // has to choose one of the product's real colors.
        color: colorState.kind === "ok" ? colorState.color : undefined,
        needsColor:
          colorState.kind === "missing" ||
          (colorState.kind === "invalid" && normalizeColors(product.colors).length > 0),
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validate(fields);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
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
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSubmitError(data.error || DEFAULT_ERROR);
        setStatus("error");
        return;
      }

      setOrderRef(typeof data.orderRef === "string" ? data.orderRef : "");
      setConfirmationEmailed(data.confirmationEmailed === true);
      setStatus("success");
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
        <div className="mx-auto flex max-w-2xl flex-col items-center rounded-lg border border-gold/25 bg-cream-100/85 px-8 py-16 text-center">
          <h1 className="text-2xl text-onyx">Order Request Received</h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-onyx/60">
            Nothing has been charged. We&apos;ll email you a final quote covering decoration,
            shipping, and tax, with a secure link to pay. We place the order with our supplier once
            your payment clears.
          </p>
          {orderRef && (
            <p className="mt-6 text-sm text-onyx/80">
              Your order reference is <span className="font-semibold text-onyx">{orderRef}</span>.
              {confirmationEmailed
                ? " We've emailed you a confirmation with the details."
                : " Keep it handy if you contact us."}
            </p>
          )}
          <Link
            href="/merchandise"
            className="mt-8 inline-flex items-center rounded-md border border-gold/60 px-6 py-3 text-sm font-semibold text-gold-dark transition-colors hover:bg-gold/10"
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
            className="text-sm font-semibold text-muted-light transition-colors hover:text-gold-bright"
          >
            ← Back to Merchandise
          </Link>
          <h1 className="mt-3 text-4xl uppercase text-white sm:text-5xl">Your Cart</h1>
        </div>
      </section>

      <section className="bg-cream px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-4xl">
          {lines.length === 0 ? (
            <div className="rounded-lg border border-gold/25 bg-cream-100/85 px-8 py-16 text-center">
              <p className="text-base text-onyx/60">Your cart is empty.</p>
              <Link
                href="/merchandise"
                className="mt-6 inline-flex items-center rounded-md bg-gold px-6 py-3 text-sm font-semibold text-onyx transition-colors hover:bg-gold-bright"
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
                      onRemove={removeItem}
                      onChooseColor={changeColor}
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
                    <p className="mt-0.5 text-xs text-onyx/50">
                      {lines.length} {lines.length === 1 ? "item" : "items"}, {unitCount}{" "}
                      {unitCount === 1 ? "unit" : "units"}
                    </p>
                  </div>
                  <p className="font-heading text-3xl font-bold tabular-nums text-onyx">
                    {formatPrice(subtotal)}
                  </p>
                </div>
                <div className="mt-4 space-y-1 border-t border-gold/15 pt-4 text-xs leading-relaxed text-onyx/50">
                  <p>{pricingDisclaimer}</p>
                  <p>{deliveryEstimate}</p>
                </div>
              </div>

              <form
                noValidate
                onSubmit={handleSubmit}
                className="relative mt-10 rounded-lg border border-gold/25 bg-cream-100/85 p-6 sm:p-10"
              >
                <h2 className="text-xl text-onyx">Submit Your Order Request</h2>
                <p className="mt-2 text-sm text-onyx/60">
                  Nothing is charged yet. We&apos;ll email you a final quote with a secure payment
                  link, and place the order with our supplier once you&apos;ve paid.
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
                      aria-invalid={Boolean(errors.firstName)}
                      className={`${inputClasses} ${errors.firstName ? "border-red-500" : ""}`}
                    />
                    {errors.firstName && (
                      <p className="mt-1.5 text-xs text-red-500">{errors.firstName}</p>
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
                      aria-invalid={Boolean(errors.lastName)}
                      className={`${inputClasses} ${errors.lastName ? "border-red-500" : ""}`}
                    />
                    {errors.lastName && (
                      <p className="mt-1.5 text-xs text-red-500">{errors.lastName}</p>
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
                      aria-invalid={Boolean(errors.email)}
                      className={`${inputClasses} ${errors.email ? "border-red-500" : ""}`}
                    />
                    {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
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
                      aria-invalid={Boolean(errors.phone)}
                      className={`${inputClasses} ${errors.phone ? "border-red-500" : ""}`}
                    />
                    {errors.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone}</p>}
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
                      className={`${inputClasses} resize-none`}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Turnstile onToken={setTurnstileToken} />
                </div>

                {status === "error" && (
                  <p className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                    {submitError || DEFAULT_ERROR}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "submitting" || blockedReason !== ""}
                  aria-describedby={blockedReason ? "submit-blocked" : undefined}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold px-6 py-4 text-sm font-semibold text-onyx transition-all hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Order Request"
                  )}
                </button>
                {blockedReason && (
                  <p id="submit-blocked" className="mt-3 text-sm text-red-600">
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

function CartProductGroup({
  group,
  onQuantity,
  onRemove,
  onChooseColor,
}: {
  group: ProductGroup;
  onQuantity: (productId: string, quantity: number, color?: string) => void;
  onRemove: (productId: string, color?: string) => void;
  onChooseColor: (productId: string, fromColor: string | undefined, toColor: string) => void;
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
          />
        ))}
      </ul>

      {(lines.length > 1 || summary.belowMinimum) && (
        <div className="space-y-1 border-t border-gold/15 px-4 py-3 text-xs sm:px-6">
          {lines.length > 1 && (
            <p className="text-onyx/60">Volume pricing applies across colors.</p>
          )}
          {summary.belowMinimum && (
            <p role="alert" className="font-semibold text-red-600">
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
}: {
  product: CatalogProduct;
  line: DisplayLine;
  colorOptions: string[];
  onQuantity: (productId: string, quantity: number, color?: string) => void;
  onRemove: (productId: string, color?: string) => void;
  onChooseColor: (productId: string, fromColor: string | undefined, toColor: string) => void;
}) {
  const selectId = useId();
  const { item } = line;
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
          <p className="truncate text-[11px] font-semibold uppercase leading-4 tracking-wide text-gold-dark">
            {product.brand}
          </p>
        )}
        <Link
          href={href}
          className="line-clamp-3 text-sm font-semibold leading-snug text-onyx hover:text-gold-dark sm:line-clamp-2"
        >
          {product.name}
        </Link>

        {line.color ? (
          <p className="mt-1 flex items-center gap-2 text-xs text-onyx/70">
            <ColorDot color={line.color} />
            <span>
              <span className="text-onyx/50">Color: </span>
              {colorLabel}
            </span>
          </p>
        ) : line.needsColor ? (
          <div className="mt-2">
            <label htmlFor={selectId} className="block text-xs font-semibold text-red-600">
              Choose a color
            </label>
            <select
              id={selectId}
              value=""
              onChange={(event) => {
                if (event.target.value)
                  onChooseColor(item.productId, item.color, event.target.value);
              }}
              className="mt-1 w-full max-w-[14rem] rounded-md border border-red-500/60 bg-cream px-2 py-1.5 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60"
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

        <p className="mt-1 text-xs text-onyx/50">{formatPrice(line.unitPrice)} per unit</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-onyx/60">
            Qty
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={item.quantity}
              aria-label={`Quantity for ${lineName}`}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                onQuantity(
                  item.productId,
                  Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
                  item.color
                );
              }}
              className="w-20 rounded-md border border-gold/25 bg-cream px-2 py-1.5 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60"
            />
          </label>
          <button
            type="button"
            onClick={() => onRemove(item.productId, item.color)}
            aria-label={`Remove ${lineName}`}
            className="text-xs font-semibold text-onyx/50 underline hover:text-red-500"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="shrink-0 text-right font-heading text-lg font-bold tabular-nums text-onyx">
        {formatPrice(line.lineTotal)}
      </div>
    </li>
  );
}
