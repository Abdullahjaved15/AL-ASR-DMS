/**
 * Frontend Pakistani Rupee (PKR) Price Parser and Formatter Utility
 * Parses strings like "40 lac", "1.5 crore", "500k", "40", "4000000" into numeric PKR,
 * and formats values for display across tables, cards, exports, and forms.
 */

export function parsePakistaniPrice(input) {
  if (input === null || input === undefined || input === '') {
    return 0;
  }

  // If already a valid number
  if (typeof input === 'number') {
    if (isNaN(input) || input <= 0) return 0;
    // In Pakistani car market shorthand, a small number (e.g. 40) means 40 Lacs
    if (input > 0 && input < 500) {
      return Math.round(input * 100000);
    }
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

  // In Pakistani automotive market context, values < 500 (e.g. 40, 55, 120, 3.5) represent Lacs
  if (parsedVal > 0 && parsedVal < 500) {
    return Math.round(parsedVal * 100000);
  }

  return Math.round(parsedVal);
}

/**
 * Format any input (number or string) to standard PKR display
 * e.g. "Rs. 4,000,000" or with words: "Rs. 4,000,000 (40.00 Lac)"
 */
export function formatPKR(val, includeWords = false) {
  const num = parsePakistaniPrice(val);
  if (!num) return 'Rs. 0';

  const standardFormatted = 'Rs. ' + num.toLocaleString();

  if (!includeWords) {
    return standardFormatted;
  }

  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, '');
    return `${standardFormatted} (${cr} Crore)`;
  } else if (num >= 100000) {
    const lac = (num / 100000).toFixed(2).replace(/\.00$/, '');
    return `${standardFormatted} (${lac} Lac)`;
  } else if (num >= 1000) {
    const k = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `${standardFormatted} (${k}k)`;
  }

  return standardFormatted;
}

/**
 * Returns clean formatted Lacs / Crore words for live helpers
 * e.g. "Rs. 4,000,000 (40 Lac)"
 */
export function getPriceHint(val) {
  if (!val || String(val).trim() === '') return '';
  const num = parsePakistaniPrice(val);
  if (!num || num <= 0) return '';

  let words = '';
  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, '');
    words = `${cr} Crore`;
  } else if (num >= 100000) {
    const lac = (num / 100000).toFixed(2).replace(/\.00$/, '');
    words = `${lac} Lac`;
  } else if (num >= 1000) {
    const k = (num / 1000).toFixed(1).replace(/\.0$/, '');
    words = `${k}k`;
  }

  return `Rs. ${num.toLocaleString()}${words ? ` (${words})` : ''}`;
}

/**
 * Compact display for badges / cards e.g. "Rs. 40 Lac", "Rs. 1.50 Crore"
 */
export function formatPKRShort(val) {
  const num = parsePakistaniPrice(val);
  if (!num) return 'Rs. 0';

  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, '');
    return `Rs. ${cr} Crore`;
  } else if (num >= 100000) {
    const lac = (num / 100000).toFixed(2).replace(/\.00$/, '');
    return `Rs. ${lac} Lac`;
  } else if (num >= 1000) {
    const k = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `Rs. ${k}k`;
  }

  return `Rs. ${num.toLocaleString()}`;
}
