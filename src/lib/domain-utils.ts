/**
 * Extracts the root domain from an email address.
 * Handles common subdomains and simple cases.
 * e.g., 'user@mail.example.com' -> 'example.com'
 * e.g., 'user@example.co.uk' -> 'example.co.uk'
 * e.g., 'user@example.com' -> 'example.com'
 *
 * @param email The email address string.
 * @returns The root domain string, or null if extraction fails.
 */
export function getRootDomain(email: string): string | null {
  if (!email || !email.includes('@')) {
    return null;
  }

  const domainPart = email.split('@')[1];
  if (!domainPart) {
    return null;
  }

  const parts = domainPart.toLowerCase().split('.');
  if (parts.length < 2) {
    return domainPart; // Return the full part if it's like 'localhost' or invalid
  }

  // Basic check for common TLDs that are part of a second-level domain (SLD)
  // This list is not exhaustive but covers many common cases.
  const commonSLDs = new Set(['co', 'com', 'org', 'net', 'gov', 'ac', 'edu']);

  // If there are more than 2 parts and the second to last part is a common SLD like 'co' in 'co.uk'
  if (parts.length > 2 && commonSLDs.has(parts[parts.length - 2])) {
    // Check if the last part is also short (like 'uk', 'jp', 'us') - indicative of ccTLD + SLD
     if (parts[parts.length - 1].length <= 3) {
       return parts.slice(-3).join('.'); // e.g., example.co.uk
     }
  }

  // Otherwise, assume the root domain is the last two parts
  return parts.slice(-2).join('.'); // e.g., example.com or mail.example
}
