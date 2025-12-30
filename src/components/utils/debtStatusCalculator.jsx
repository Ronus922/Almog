/**
 * Single Source of Truth for debt_status_auto calculation
 * 
 * @param {number} totalDebt - Total debt amount
 * @param {boolean} isArchived - Whether record is archived
 * @param {object} settings - Settings object with thresholds
 * @returns {object} { status, debug }
 */
export function getDebtStatus(totalDebt, isArchived, settings) {
  // If archived, always "תקין"
  if (isArchived) {
    return {
      status: 'תקין',
      debug: `archived=true -> תקין`
    };
  }

  // Parse and validate settings
  const td = Number(totalDebt) || 0;
  
  // Clean and parse thresholds (remove ₪, commas, spaces)
  const cleanNumber = (val) => {
    if (val === null || val === undefined) return NaN;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[₪,\s]/g, '');
    return Number(cleaned);
  };

  const collect = cleanNumber(settings?.threshold_collect_from);
  const legal = cleanNumber(settings?.threshold_legal_from);

  // Validation: both must be valid numbers
  if (isNaN(collect) || isNaN(legal)) {
    return {
      status: 'תקין',
      debug: `ERROR: invalid thresholds - collect=${settings?.threshold_collect_from} legal=${settings?.threshold_legal_from}`,
      error: true
    };
  }

  // Calculate status
  let status = 'תקין';
  if (td >= legal) {
    status = 'חריגה מופרזת';
  } else if (td >= collect) {
    status = 'לגבייה מיידית';
  }

  // Debug output
  const debug = [
    `td=${td.toFixed(0)}`,
    `collect=${collect.toFixed(0)}`,
    `legal=${legal.toFixed(0)}`,
    `td>=legal=${td >= legal}`,
    `td>=collect=${td >= collect}`,
    `result=${status}`,
    settings?.id ? `settingsId=${settings.id}` : ''
  ].filter(Boolean).join(' | ');

  return { status, debug };
}

/**
 * Get the active settings record
 * @param {Array} allSettings - All settings records
 * @returns {object|null} Active settings or null
 */
export function getActiveSettings(allSettings) {
  if (!allSettings || allSettings.length === 0) return null;
  
  // Find the active one
  const active = allSettings.find(s => s.isActive === true);
  if (active) return active;
  
  // Fallback: if no active, take first
  console.warn('[getActiveSettings] No active settings found, using first record');
  return allSettings[0];
}