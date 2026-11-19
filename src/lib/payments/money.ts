/** Exact money helpers for the marketplace's initial currency (NGN: 100 kobo = ₦1).
 * Financial calculations use integer minor units; never use binary floating point for sums.
 */
export const NGN = "NGN" as const;
export const NGN_MINOR_UNITS = 100n;

function expandExponent(value: string): string {
  const match = value.match(/^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
  if (!match) throw new Error("Invalid monetary amount");
  const sign = match[1] || "";
  const whole = match[2];
  const fraction = match[3] || "";
  const exponent = Number(match[4] || 0);
  const digits = whole + fraction;
  const decimalPosition = whole.length + exponent;
  if (decimalPosition <= 0) return `${sign}0.${"0".repeat(-decimalPosition)}${digits}`;
  if (decimalPosition >= digits.length) return `${sign}${digits}${"0".repeat(decimalPosition - digits.length)}`;
  return `${sign}${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;
}

/** Convert a decimal amount to minor units, rounding half-up to the currency precision. */
export function toMinorUnits(amount: number | string | bigint, fractionDigits = 2): bigint {
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 6) throw new Error("Unsupported currency precision");
  if (typeof amount === "bigint") return amount * (10n ** BigInt(fractionDigits));
  if (typeof amount === "number" && !Number.isFinite(amount)) throw new Error("Amount must be finite");
  const input = expandExponent(String(amount).trim());
  const match = input.match(/^([+-]?)(\d+)(?:\.(\d*))?$/);
  if (!match) throw new Error("Invalid monetary amount");
  const negative = match[1] === "-";
  const whole = BigInt(match[2]);
  const fraction = match[3] || "";
  const scale = 10n ** BigInt(fractionDigits);
  const kept = (fraction.slice(0, fractionDigits) + "0".repeat(fractionDigits)).slice(0, fractionDigits);
  let result = whole * scale + BigInt(kept || "0");
  if (fraction.length > fractionDigits && Number(fraction[fractionDigits]) >= 5) result += 1n;
  return negative ? -result : result;
}

/** Convert NGN kobo into an exact decimal string (no JS float formatting). */
export function minorToMajorString(minor: bigint | string | number, fractionDigits = 2): string {
  const value = typeof minor === "bigint" ? minor : BigInt(minor);
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const scale = 10n ** BigInt(fractionDigits);
  const major = absolute / scale;
  if (fractionDigits === 0) return `${sign}${major}`;
  const fraction = String(absolute % scale).padStart(fractionDigits, "0");
  return `${sign}${major}.${fraction}`;
}

/** JSON/API representation for BigInt minor values. */
export function minorToJson(minor: bigint | null | undefined): string | null {
  return minor == null ? null : minor.toString();
}

export function toPaystackAmount(minor: bigint): number {
  if (minor <= 0n || minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Payment amount is outside Paystack's safe integer range");
  return Number(minor);
}

/** Fixed-point quantity for fabric (up to four decimal places); returns units × 10,000. */
export function quantityToTenThousandths(quantity: number | string): bigint {
  const n = toMinorUnits(quantity, 4);
  if (n <= 0n) throw new Error("Quantity must be greater than zero");
  return n;
}

/** Price in minor units × quantity in ten-thousandths, rounded half-up to a minor unit. */
export function multiplyMinorByQuantity(priceMinor: bigint, quantityTenThousandths: bigint): bigint {
  if (priceMinor < 0n || quantityTenThousandths <= 0n) throw new Error("Invalid price or quantity");
  const numerator = priceMinor * quantityTenThousandths;
  const denominator = 10_000n;
  return (numerator + denominator / 2n) / denominator;
}

export function formatNgn(minor: bigint | string | number, locale = "en-NG"): string {
  const value = typeof minor === "bigint" ? minor : BigInt(minor);
  const major = Number(value) / 100;
  if (!Number.isSafeInteger(Number(value))) return `₦${minorToMajorString(value)}`;
  return new Intl.NumberFormat(locale, { style: "currency", currency: NGN, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(major);
}
