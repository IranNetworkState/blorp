/**
 * RTL (Right-to-Left) Detection Utility
 * 
 * Auto-detects if text content is RTL by analyzing the characters.
 * Works regardless of language_id setting - detects Persian, Arabic, Hebrew, Urdu.
 */

// Unicode ranges for RTL scripts
// Persian: U+0600–U+06FF (Arabic script used for Persian)
// Arabic: U+0600–U+06FF, U+0750–U+077F, U+08A0–U+08FF
// Hebrew: U+0590–U+05FF
// Urdu: Uses Arabic script U+0600–U+06FF
const RTL_CHAR_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// Lemmy language IDs for RTL languages (fallback if text check is inconclusive)
const RTL_LANGUAGE_IDS = new Set([
  2,   // Arabic (ar)
  15,  // Hebrew (he) 
  31,  // Persian/Farsi (fa)
  74,  // Urdu (ur)
]);

/**
 * Auto-detects if content is RTL by checking for RTL characters
 * 
 * @param text - The text content to analyze (optional)
 * @param languageId - The Lemmy language ID (optional fallback)
 * @returns true if content is RTL, false otherwise
 * 
 * @example
 * detectRTL("سلام") // true - Contains Persian text
 * detectRTL("Hello") // false - Latin text
 * detectRTL("مرحبا World") // true - Mixed, but starts with Arabic
 * detectRTL(undefined, 31) // true - Fallback to language ID
 */
export function detectRTL(text?: string | null, languageId?: number | null): boolean {
  // First priority: Check actual text content
  if (text) {
    // Get first 100 characters for performance
    const sample = text.slice(0, 100);
    // If we find any RTL characters, consider it RTL content
    if (RTL_CHAR_REGEX.test(sample)) {
      return true;
    }
  }
  
  // Second priority: Check language ID
  if (languageId && languageId !== 0) {
    return RTL_LANGUAGE_IDS.has(languageId);
  }
  
  // Default to LTR
  return false;
}

/**
 * Legacy function - checks language ID only
 * @deprecated Use detectRTL(text, languageId) instead for better auto-detection
 */
export function isRTL(languageId?: number | null): boolean {
  return detectRTL(undefined, languageId);
}
