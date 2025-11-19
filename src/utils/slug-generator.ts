/**
 * Generates a URL-friendly slug from a string
 * Format: lowercase-words-with-hyphens-XXXXXX (6-digit random suffix)
 *
 * @param text - The text to slugify
 * @returns A slug with random 6-digit suffix for uniqueness
 *
 * @example
 * generateSlug('Luxury Leather Handbag') // Returns: 'luxury-leather-handbag-XXXXXX'
 * generateSlug('LOUIS VUITTON Bag 2024') // Returns: 'louis-vuitton-bag-2024-XXXXXX'
 */
export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Slug text must be a non-empty string');
  }

  // Convert to lowercase and trim
  let slug = text.toLowerCase().trim();

  // Remove special characters, keep only alphanumeric and spaces
  slug = slug.replace(/[^\w\s-]/g, '');

  // Replace spaces and underscores with hyphens
  slug = slug.replace(/[\s_]+/g, '-');

  // Remove multiple consecutive hyphens
  slug = slug.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');

  // Add random 6-digit suffix for uniqueness
  const randomSuffix = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');

  return `${slug}-${randomSuffix}`;
}

/**
 * Generates a slug without the random suffix (useful for category slugs that need to be predictable)
 *
 * @param text - The text to slugify
 * @returns A slug without random suffix
 *
 * @example
 * generateStaticSlug('Luxury Leather Handbag') // Returns: 'luxury-leather-handbag'
 */
export function generateStaticSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Slug text must be a non-empty string');
  }

  // Convert to lowercase and trim
  let slug = text.toLowerCase().trim();

  // Remove special characters, keep only alphanumeric and spaces
  slug = slug.replace(/[^\w\s-]/g, '');

  // Replace spaces and underscores with hyphens
  slug = slug.replace(/[\s_]+/g, '-');

  // Remove multiple consecutive hyphens
  slug = slug.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');

  return slug;
}

/**
 * Validates if a string is a valid slug format
 *
 * @param slug - The slug to validate
 * @returns true if valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Slug should only contain lowercase letters, numbers, hyphens, and end with -XXXXXX
  return /^[a-z0-9]+(?:-[a-z0-9]+)*-\d{6}$/.test(slug);
}

/**
 * Validates if a string is a valid static slug format (without random suffix)
 *
 * @param slug - The slug to validate
 * @returns true if valid, false otherwise
 */
export function isValidStaticSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Static slug should only contain lowercase letters, numbers, and hyphens
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Extracts the base slug (without the random suffix) from a full slug
 *
 * @param slug - The full slug with random suffix
 * @returns The base slug without the suffix
 *
 * @example
 * getBaseSlug('luxury-leather-handbag-123456') // Returns: 'luxury-leather-handbag'
 */
export function getBaseSlug(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Slug must be a non-empty string');
  }

  // Remove the last 7 characters (hyphen + 6 digits)
  const lastHyphenIndex = slug.lastIndexOf('-');
  if (lastHyphenIndex === -1) {
    return slug;
  }

  const potentialSuffix = slug.substring(lastHyphenIndex + 1);
  if (/^\d{6}$/.test(potentialSuffix)) {
    return slug.substring(0, lastHyphenIndex);
  }

  return slug;
}
