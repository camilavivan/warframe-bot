/**
 * Normalize Traditional Chinese (TW) strings from warframe-worldstate-data `zh`
 * locale into Simplified Chinese for user-facing output.
 */
import OpenCC from 'opencc-js';

type ConverterFn = (text: string) => string;

let converter: ConverterFn | undefined;

function getConverter(): ConverterFn {
  if (converter) return converter;
  const c = OpenCC.Converter({ from: 'tw', to: 'cn' });
  converter = c;
  return c;
}

/** Convert Traditional → Simplified; no-op for empty / non-string. */
export function toSimplified(text: string): string {
  if (typeof text !== 'string' || text.length === 0) return text as string;
  return getConverter()(text);
}

/** Deep-walk a JSON-like value and convert every string leaf. */
export function deepToSimplified<T>(value: T): T {
  if (typeof value === 'string') return toSimplified(value) as T;
  if (Array.isArray(value)) {
    return value.map((item) => deepToSimplified(item)) as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepToSimplified(v);
    }
    return out as T;
  }
  return value;
}
