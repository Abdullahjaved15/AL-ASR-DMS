/**
 * Frontend Pakistani Rupee (PKR) Price Parser and Formatter Utility
 * Parses strings like "5 lac", "40 lac", "1.5 crore", "500k", "40", "4000000" into numeric PKR,
 * and formats values for display across tables, cards, exports, and forms in human Pakistani notation (e.g. 5 Lac, 40 Lac, 1.5 Crore).
 */

export function parsePakistaniPrice(input) {
  if (input === null || input === undefined || input === '') {
    return 0;
  }

  // If already a valid number, return rounded value directly
  if (typeof input === 'number') {
    if (isNaN(input) || input <= 0) return 0;
    return Math.round(input);
  }

  let str = String(input).trim().toLowerCase();
  if (str === '' || str === '0' || str.includes('un-known') || str.includes('applied for') || str === 'any') {
    return 0;
  }

  // Remove currency words and symbol prefixes
  str = str.replace(/^(rs\.?|pkr|rupees?|rs\s*\/-\s*)\s*/gi, '').replace(/\/\-\s*$/g, '').trim();

  // If range like "40 - 45 lac", parse first value
  if (str.includes('-')) {
    const parts = str.split('-');
    const val = parsePakistaniPrice(parts[0]);
    if (val > 0) return val;
  }

  let total = 0;
  let matchedUnit = false;

  // 1. Check Crore + Lac combinations (e.g. "1 crore 25 lac" or "1 cr 50 lac")
  const croreMatch = str.match(/([\d.]+)\s*(?:crore|cror|cr|kror)\b/i) || str.match(/([\d.]+)\s*cr\b/i);
  if (croreMatch) {
    const crVal = parseFloat(croreMatch[1]);
    if (!isNaN(crVal)) {
      total += crVal * 10000000;
      matchedUnit = true;
    }
  }

  const lacMatch = str.match(/([\d.]+)\s*(?:lac|lacs|lakh|lakhs|l\b)/i) || str.match(/([\d.]+)\s*l\b/i);
  if (lacMatch) {
    const lacVal = parseFloat(lacMatch[1]);
    if (!isNaN(lacVal)) {
      total += lacVal * 100000;
      matchedUnit = true;
    }
  }

  const thousandMatch = str.match(/([\d.]+)\s*(?:k|thousand|hazar|haz)\b/i);
  if (thousandMatch) {
    const kVal = parseFloat(thousandMatch[1]);
    if (!isNaN(kVal)) {
      total += kVal * 1000;
      matchedUnit = true;
    }
  }

  const millionMatch = str.match(/([\d.]+)\s*(?:million|m\b)/i);
  if (millionMatch) {
    const mVal = parseFloat(millionMatch[1]);
    if (!isNaN(mVal)) {
      total += mVal * 1000000;
      matchedUnit = true;
    }
  }

  if (matchedUnit) {
    return Math.round(total);
  }

  // 2. Plain numbers (with optional commas/periods)
  const cleanNumStr = str.replace(/,/g, '').replace(/[^\d.]/g, '');
  const parsedVal = parseFloat(cleanNumStr);

  if (isNaN(parsedVal) || parsedVal <= 0) {
    return 0;
  }

  return Math.round(parsedVal);
}

/**
 * Normalizes user-entered price to clean Pakistani notation (e.g. "5 Lac", "40 Lac", "1.5 Crore", "50k")
 * only when explicit shorthand units were typed. Plain numeric inputs (e.g. "20000", "2000") are preserved.
 */
export function normalizePriceInput(val) {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val).trim();
  if (str === '') return '';

  // If user already typed "5 lac", "40 lac", "1.5 crore", "50k", preserve and capitalize cleanly
  if (/^[\d.]+\s*(?:lac|lacs|lakh|lakhs|crore|cror|cr|k|thousand)\b/i.test(str)) {
    return str
      .replace(/\b(lac|lacs|lakh|lakhs)\b/gi, 'Lac')
      .replace(/\b(crore|cror|cr)\b/gi, 'Crore')
      .replace(/\b(k|thousand)\b/gi, 'k');
  }

  return str;
}

/**
 * Format any input (number or string) to standard formatted PKR currency
 * e.g. 20000 -> "Rs. 20,000", 2000 -> "Rs. 2,000", 2000000 -> "Rs. 2,000,000", "5 lac" -> "Rs. 5 Lac"
 */
export function formatPKR(val, withPrefix = true) {
  if (val === null || val === undefined || val === '' || val === 0 || val === '0') {
    return withPrefix ? 'Rs. 0' : '0';
  }

  const prefix = withPrefix ? 'Rs. ' : '';

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\s*(rs\.?|pkr)?\s*[\d.]+\s*(?:lac|lacs|lakh|lakhs|crore|cror|cr|k|thousand)\b/i.test(trimmed)) {
      const cleanWithoutPrefix = trimmed.replace(/^(rs\.?|pkr)\s*/i, '').trim();
      const formatted = cleanWithoutPrefix
        .replace(/\b(lac|lacs|lakh|lakhs)\b/gi, 'Lac')
        .replace(/\b(crore|cror|cr)\b/gi, 'Crore')
        .replace(/\b(k|thousand)\b/gi, 'k');
      return `${prefix}${formatted}`;
    }
  }

  const num = parsePakistaniPrice(val);
  if (!num || num <= 0) return `${prefix}0`;

  return `${prefix}${num.toLocaleString()}`;
}

/**
 * Returns clean formatted Lacs / Crore words for live helpers
 * e.g. "5 Lac" or "1.5 Crore"
 */
export function getPriceHint(val) {
  if (!val || String(val).trim() === '') return '';
  const num = parsePakistaniPrice(val);
  if (!num || num <= 0) return '';

  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return `Calculated: ${cr} Crore (PKR ${num.toLocaleString()})`;
  } else if (num >= 100000) {
    const lac = (num / 100000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return `Calculated: ${lac} Lac (PKR ${num.toLocaleString()})`;
  } else if (num >= 1000) {
    const k = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `Calculated: ${k}k (PKR ${num.toLocaleString()})`;
  }

  return `Calculated: PKR ${num.toLocaleString()}`;
}

/**
 * Compact display without Rs prefix e.g. "5 Lac", "40 Lac", "1.5 Crore"
 */
export function formatPKRShort(val) {
  return formatPKR(val, false);
}

/**
 * Returns current formatted time in 12-hour AM/PM format (e.g. "03:45 PM")
 */
export function getCurrentFormattedTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${strHours}:${minutes} ${ampm}`;
}

/**
 * Returns current day of week in English / Urdu context (e.g. "Friday")
 */
export function getCurrentDayName() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

/**
 * Converts numeric amount to Pakistani Rupee Words
 * e.g. 5000000 -> "Rupees Fifty Lakh Only"
 *      12500000 -> "Rupees One Crore Twenty-Five Lakh Only"
 *      75000 -> "Rupees Seventy-Five Thousand Only"
 */
export function numberToWordsPKR(num) {
  const n = typeof num === 'number' ? num : parsePakistaniPrice(num);
  if (!n || isNaN(n) || n <= 0) return '';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(v) {
    if (v < 20) return ones[v];
    const rem = v % 10;
    return tens[Math.floor(v / 10)] + (rem > 0 ? '-' + ones[rem] : '');
  }

  function convertThreeDigits(v) {
    const hundred = Math.floor(v / 100);
    const remainder = v % 100;
    let res = '';
    if (hundred > 0) {
      res += ones[hundred] + ' Hundred';
      if (remainder > 0) res += ' ';
    }
    if (remainder > 0) {
      res += convertTwoDigits(remainder);
    }
    return res;
  }

  // South Asian Numbering System (Crores, Lakhs, Thousands, Hundreds)
  let val = Math.round(n);
  let words = '';

  // Crores (>= 1,00,00,000)
  const crore = Math.floor(val / 10000000);
  val %= 10000000;
  if (crore > 0) {
    words += (crore >= 100 ? convertThreeDigits(crore) : (crore < 20 ? ones[crore] : convertTwoDigits(crore))) + ' Crore ';
  }

  // Lakhs (>= 1,00,000)
  const lakh = Math.floor(val / 100000);
  val %= 100000;
  if (lakh > 0) {
    words += (lakh < 20 ? ones[lakh] : convertTwoDigits(lakh)) + ' Lakh ';
  }

  // Thousands (>= 1,000)
  const thousand = Math.floor(val / 1000);
  val %= 1000;
  if (thousand > 0) {
    words += (thousand < 20 ? ones[thousand] : convertTwoDigits(thousand)) + ' Thousand ';
  }

  // Hundreds & Remaining (< 1,000)
  if (val > 0) {
    words += convertThreeDigits(val);
  }

  words = words.trim();
  return words ? `Rupees ${words} Only` : '';
}

