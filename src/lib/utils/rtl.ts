/**
 * RTL (Right-to-Left) Language Detection Utility
 * 
 * Determines if a given Lemmy language ID corresponds to a right-to-left language.
 * Used to apply appropriate text direction (dir="rtl") to content.
 */

// Lemmy language IDs for RTL languages
// Based on Lemmy's language table in the database
const RTL_LANGUAGE_IDS = new Set([
  2,   // Arabic (ar)
  15,  // Hebrew (he) 
  31,  // Persian/Farsi (fa)
  74,  // Urdu (ur)
  // Add other RTL languages as needed
]);

/**
 * Checks if a language ID corresponds to an RTL language
 * 
 * @param languageId - The Lemmy language ID from post.language_id
 * @returns true if the language is RTL, false otherwise
 * 
 * @example
 * isRTL(31) // true - Persian
 * isRTL(0)  // false - Undetermined
 * isRTL(37) // false - English
 */
export function isRTL(languageId?: number | null): boolean {
  // Undetermined (0) or missing language ID defaults to LTR
  if (!languageId || languageId === 0) return false;
  
  return RTL_LANGUAGE_IDS.has(languageId);
}
