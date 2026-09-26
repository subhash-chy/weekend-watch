/**
 * CSS-module helpers.
 *
 * Why this exists: `noUncheckedIndexedAccess` is enabled, so indexing a CSS
 * module map yields `string | undefined`. That is correct for arrays — and it is
 * what catches real bugs in the carousel and catalogue code — but it makes
 * `classNames({ [styles.variant]: on })` a type error, because a computed
 * property name cannot be `undefined`.
 *
 * Rather than weakening the compiler flag, class lookups go through {@link cls},
 * which resolves the value once and guarantees a `string`.
 */

/** A CSS-module class map as emitted by Vite. */
export type ClassMap = Readonly<Record<string, string>>;

/**
 * Resolves a class name from a CSS module, tolerating a missing entry.
 *
 * A missing key yields an empty string, which `classnames` ignores, so a
 * renamed or deleted class degrades to "no class" instead of crashing the
 * render with `className="undefined"`.
 *
 * @param map - The imported CSS module.
 * @param key - Class name to look up.
 * @returns The hashed class name, or `''` when absent.
 */
export function cls(map: ClassMap, key: string): string {
  return map[key] ?? '';
}

/**
 * Resolves several class names at once.
 *
 * @param map - The imported CSS module.
 * @param keys - Class names to look up.
 * @returns A space-joined class string.
 */
export function clsAll(map: ClassMap, keys: readonly string[]): string {
  return keys
    .map((key) => map[key])
    .filter((value): value is string => value !== undefined && value.length > 0)
    .join(' ');
}
