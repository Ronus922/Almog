/**
 * Phone Parsing Utilities - Single Source of Truth
 * 
 * Central parser for extracting phone numbers from raw text
 */

/**
 * Parse raw phone text into structured phone fields
 * @param {string} phoneText - Raw phone text from Excel or user input
 * @returns {Object} - { phoneOwner, phoneTenant, phonePrimary, phonesRaw }
 */
export function parsePhoneNumbers(phoneText) {
  if (!phoneText) {
    return { 
      phoneOwner: '', 
      phoneTenant: '', 
      phonePrimary: '', 
      phonesRaw: '' 
    };
  }

  const raw = String(phoneText).trim();
  
  // Normalize +972 to 0
  let normalized = raw.replace(/\+972[\s-]*/g, '0');
  
  // Extract all digits
  const digitsOnly = normalized.replace(/\D/g, '');
  const validNumbers = [];

  let i = 0;
  while (i < digitsOnly.length) {
    // Check for 10-digit mobile numbers (05...)
    if (i + 10 <= digitsOnly.length) {
      const candidate = digitsOnly.substring(i, i + 10);
      if (candidate.startsWith('05') && !/^0+$/.test(candidate)) {
        validNumbers.push(candidate);
        i += 10;
        continue;
      }
    }
    
    // Check for 9-digit landline numbers (0...)
    if (i + 9 <= digitsOnly.length) {
      const candidate = digitsOnly.substring(i, i + 9);
      if (candidate.startsWith('0') && !candidate.startsWith('05') && !/^0+$/.test(candidate)) {
        validNumbers.push(candidate);
        i += 9;
        continue;
      }
    }
    
    i++;
  }

  // Assign phones: first is owner, second is tenant
  const phoneOwner = validNumbers[0] || '';
  const phoneTenant = validNumbers[1] || '';
  const phonePrimary = phoneOwner || phoneTenant || '';

  return { 
    phoneOwner, 
    phoneTenant, 
    phonePrimary, 
    phonesRaw: raw 
  };
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {string} - Error message or empty string if valid
 */
export function validatePhone(phone) {
  if (!phone || phone.trim() === '') return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length < 7 || cleaned.length > 11) {
    return 'מספר טלפון לא תקין';
  }
  
  return '';
}

/**
 * Format phone for display
 * @param {string} phone - Phone number
 * @returns {string} - Formatted phone or placeholder
 */
export function formatPhone(phone) {
  if (!phone) return 'אין מספר';
  
  const cleaned = phone.replace(/\D/g, '');
  if (/^0+$/.test(cleaned)) return 'אין מספר';
  
  return phone;
}