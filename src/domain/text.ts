/**
 * Fills `{name}` slots in a copy template. Values are substituted as given,
 * so callers format numbers first. Unknown slots are left in place, which
 * makes a missing value visible in the UI instead of silently vanishing.
 */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
