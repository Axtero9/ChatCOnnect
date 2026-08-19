/**
 * Simple text filter to censor severe slurs and offensive language.
 */

// Hardcoded list of severe slurs and offensive words (case-insensitive)
const BLACKLIST = [
  'nigger', 'nigga', 'faggot', 'fag', 'kike', 'chink', 'spic', 'wetback',
  'retard', 'cunt', 'bitch', 'whore', 'slut', 'kill yourself', 'kys'
];

// Regex builder for whole-word / flexible matching
const buildRegex = (word) => {
  // Escape regex special chars
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'gi');
};

const regexList = BLACKLIST.map(buildRegex);

/**
 * Filters and sanitizes text by replacing blacklisted terms with asterisks.
 * @param {string} text
 * @returns {{ sanitized: string, flagged: boolean }}
 */
function sanitizeMessage(text) {
  if (typeof text !== 'string') return { sanitized: '', flagged: false };

  let flagged = false;
  let sanitized = text;

  for (const regex of regexList) {
    if (regex.test(sanitized)) {
      flagged = true;
      sanitized = sanitized.replace(regex, (match) => '*'.repeat(match.length));
    }
  }

  return { sanitized, flagged };
}

module.exports = {
  sanitizeMessage,
  BLACKLIST
};
