/**
 * Rounds to a fixed number of decimals. Pot sizes are kept to two decimals
 * (the generator's opening pot to one) so the numbers shown on the table
 * match the numbers the coach reasons about; without rounding, repeated
 * additions of bet sizes drift into long floating-point tails.
 */
export function roundTo(x: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(x * factor) / factor;
}
