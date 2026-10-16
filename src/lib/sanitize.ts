/**
 * Escapes common HTML character markers to prevent Cross-Site Scripting (XSS)
 * vulnerability injections in inputs.
 */
export function sanitizeString(val: string): string {
  if (!val) return val;
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Keys that should never undergo HTML sanitization/transformation (e.g., passwords)
 * to prevent unintended mutations prior to security service processing.
 */
const EXCLUDED_KEYS = new Set([
  "password",
  "newPassword",
  "confirmPassword",
  "currentPassword",
  "oldPassword",
]);

/**
 * Recursively parses and sanitizes all properties of any payload object or array.
 */
export function sanitizePayload<T>(payload: T): T {
  if (typeof payload === "string") {
    return sanitizeString(payload) as unknown as T;
  }
  if (payload && typeof payload === "object") {
    const copy = Array.isArray(payload) ? [] : {};
    for (const key in payload) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        if (EXCLUDED_KEYS.has(key) || key.toLowerCase().includes("password")) {
          (copy as any)[key] = (payload as any)[key];
        } else {
          (copy as any)[key] = sanitizePayload((payload as any)[key]);
        }
      }
    }
    return copy as T;
  }
  return payload;
}

