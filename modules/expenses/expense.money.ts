/** Exact INR arithmetic. Never convert stored money to floating point. */
export function moneyToPaise(value: string): bigint {
  if (!/^(0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(value))
    throw new Error(
      "Use a positive INR amount with at most two decimal places (maximum 12 whole digits).",
    );
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}
export function paiseToMoney(value: bigint): string {
  return `${value / BigInt(100)}.${(value % BigInt(100)).toString().padStart(2, "0")}`;
}
export function canonicalMoney(value: string): string {
  return paiseToMoney(moneyToPaise(value));
}
export function formatMoney(value: string): string {
  const [whole, fraction = "00"] = value.split(".");
  return `₹${BigInt(whole).toLocaleString("en-IN")}.${fraction.padEnd(2, "0")}`;
}
