/**
 * Formats Pakistani phone numbers into standard local format: 03xxxxxxxxx (11 digits, no spaces, no dashes, no country code).
 * Example:
 *   "+92 300 1234567" -> "03001234567"
 *   "0300-9200474"   -> "03009200474"
 *   "923215586269"   -> "03215586269"
 *   "3018600756"     -> "03018600756"
 */
function formatPakistaniPhone(phoneStr) {
  if (!phoneStr) return '03000000000';
  let str = phoneStr.toString().trim();
  
  // Remove all non-digit characters
  let digits = str.replace(/[^\d]/g, '');

  // Remove leading country code 0092 or 92
  if (digits.startsWith('0092')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('92') && digits.length >= 11) {
    digits = digits.slice(2);
  }

  // Ensure starts with 0 for 10-digit numbers starting with 3
  if (!digits.startsWith('0') && digits.length === 10 && digits.startsWith('3')) {
    digits = '0' + digits;
  }

  // Return clean 11-digit Pakistani phone number starting with 03
  if (digits.length === 11 && digits.startsWith('03')) {
    return digits;
  }

  // Fallback for custom or dummy inputs
  return digits.length > 0 ? digits : '03000000000';
}

module.exports = { formatPakistaniPhone };
