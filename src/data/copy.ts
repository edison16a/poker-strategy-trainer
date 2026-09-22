import raw from "./copy.json";

/**
 * Every user-facing string, grouped by the screen area that shows it.
 * Strings with `{name}` slots are templates for `fmt`. Strings that begin
 * or end with a space are deliberate: they are concatenated with a value in
 * the component, and the spacing has to live somewhere.
 */
export const COPY = raw;
