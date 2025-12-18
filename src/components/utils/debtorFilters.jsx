/**
 * Debtor Records Filtering Utilities
 * 
 * Ensures each apartmentNumber appears only once (most recent record)
 * and applies business logic filters.
 */

/**
 * Get the most recent record for each apartmentNumber
 * @param {Array} records - All debtor records
 * @returns {Array} - Deduplicated records (one per apartmentNumber)
 */
export function getUniqueDebtorRecords(records) {
  if (!records || records.length === 0) return [];

  // Group by apartmentNumber
  const grouped = {};
  
  records.forEach(record => {
    const aptKey = record.apartmentNumber;
    if (!aptKey) return;

    if (!grouped[aptKey]) {
      grouped[aptKey] = record;
    } else {
      // Compare dates - keep the most recent
      const existingDate = new Date(record.updated_date || record.created_date);
      const currentDate = new Date(grouped[aptKey].updated_date || grouped[aptKey].created_date);
      
      if (existingDate > currentDate) {
        grouped[aptKey] = record;
      }
    }
  });

  return Object.values(grouped);
}

/**
 * Get active debtors (not archived, totalDebt > 0)
 * @param {Array} records - All debtor records
 * @returns {Array} - Filtered active debtors
 */
export function getActiveDebtors(records) {
  const uniqueRecords = getUniqueDebtorRecords(records);
  
  return uniqueRecords.filter(record => 
    record.isArchived === false && 
    (record.totalDebt || 0) > 0
  );
}

/**
 * Get archived debtors
 * @param {Array} records - All debtor records
 * @returns {Array} - Filtered archived debtors
 */
export function getArchivedDebtors(records) {
  const uniqueRecords = getUniqueDebtorRecords(records);
  
  return uniqueRecords.filter(record => record.isArchived === true);
}

/**
 * Get count of unique apartments
 * @param {Array} records - All debtor records
 * @returns {number} - Count of distinct apartmentNumbers
 */
export function getUniqueApartmentCount(records) {
  if (!records || records.length === 0) return 0;
  
  const uniqueApartments = new Set(
    records
      .map(r => r.apartmentNumber)
      .filter(Boolean)
  );
  
  return uniqueApartments.size;
}

/**
 * Get all unique records (regardless of status)
 * @param {Array} records - All debtor records
 * @returns {Array} - All unique records
 */
export function getAllUniqueRecords(records) {
  return getUniqueDebtorRecords(records);
}