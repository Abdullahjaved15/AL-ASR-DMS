/**
 * Comprehensive Pakistani Rupee (PKR) Price Parser and Formatter Utility
 * Handles Lakhs (Lac/Lacs/Lakh/Lakhs), Crores (Cr/Crore/Cror), Thousands (k/thousand/hazar),
 * and standard numeric string inputs (e.g. 40 lac, 1.5 crore, 4000000, 40).
 */

function parsePakistaniPrice(input) {
  if (input === null || input === undefined || input === '') {
    return 0;
  }

  // If already a valid number
  if (typeof input === 'number') {
    if (isNaN(input) || input <= 0) return 0;
    // If entered as small shorthand number (e.g., 40 in Pakistani car dealership means 40 Lac)
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
  // Strip non-digit and non-decimal characters
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
 * Normalizes user-entered price to human Pakistani notation (e.g. "5 Lac", "40 Lac", "1.5 Crore", "50k")
 * so that "5 lac" is preserved and stored as "5 Lac" instead of expanding into "500000".
 */
function normalizePriceInput(val) {
  if (val === null || val === undefined || val === '') return '';
  const str = String(val).trim();
  if (str === '') return '';

  if (/^[\d.]+\s*(?:lac|lacs|lakh|lakhs|crore|cror|cr|k|thousand)\b/i.test(str)) {
    return str
      .replace(/\b(lac|lacs|lakh|lakhs)\b/gi, 'Lac')
      .replace(/\b(crore|cror|cr)\b/gi, 'Crore')
      .replace(/\b(k|thousand)\b/gi, 'k');
  }

  const cleanNum = parseFloat(str.replace(/,/g, '').replace(/[^\d.]/g, ''));
  if (!isNaN(cleanNum) && cleanNum > 0) {
    if (cleanNum < 500) {
      return `${cleanNum} Lac`;
    }
    if (cleanNum >= 10000000) {
      const cr = (cleanNum / 10000000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
      return `${cr} Crore`;
    }
    if (cleanNum >= 100000) {
      const lac = (cleanNum / 100000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
      return `${lac} Lac`;
    }
    if (cleanNum >= 1000) {
      const k = (cleanNum / 1000).toFixed(1).replace(/\.0$/, '');
      return `${k}k`;
    }
  }

  return str;
}

/**
 * Format a number/string to human Pakistani Lac & Crore formatted text
 * e.g. 500000 / "5 lac" -> "Rs. 5 Lac"
 */
function formatPakistaniPrice(val, withPrefix = true) {
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

  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return `${prefix}${cr} Crore`;
  } else if (num >= 100000) {
    const lac = (num / 100000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return `${prefix}${lac} Lac`;
  } else if (num >= 1000) {
    const k = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `${prefix}${k}k`;
  }

  return `${prefix}${num.toLocaleString()}`;
}

/**
 * Short representation for cards and chips e.g. "5 Lac", "40 Lac", "1.5 Crore", "50k"
 */
function formatPriceShort(val) {
  return formatPakistaniPrice(val, true);
}

module.exports = {
  parsePakistaniPrice,
  normalizePriceInput,
  formatPakistaniPrice,
  formatPriceShort
};
