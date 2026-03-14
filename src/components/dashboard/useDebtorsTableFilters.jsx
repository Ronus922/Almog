import { useState, useMemo } from 'react';
import { normalizeApartmentNumber } from '../utils/apartmentNormalizer';

export function useDebtorsTableFilters(records, allStatuses) {
  const [search, setSearch] = useState('');
  const [apartmentSearch, setApartmentSearch] = useState('');
  const [autoStatusFilter, setAutoStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('totalDebt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [minDebt, setMinDebt] = useState('');
  const [maxDebt, setMaxDebt] = useState('');
  const [ownerNameFilter, setOwnerNameFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [legalStatusFilter, setLegalStatusFilter] = useState('all');

  const legalStatuses = allStatuses.filter((s) => s.type === 'LEGAL');

  const getLegalStatusForRecord = (record) => {
    if (!record.legal_status_id) return null;
    return legalStatuses.find((s) => s.id === record.legal_status_id) || null;
  };

  const normApt = normalizeApartmentNumber;

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (apartmentSearch) {
      const normQuery = normApt(apartmentSearch);
      result = result.filter((r) => normApt(r.apartmentNumber).includes(normQuery));
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((r) =>
        r.apartmentNumber?.toLowerCase().includes(s) ||
        r.ownerName?.toLowerCase().includes(s) ||
        r.phonePrimary?.toLowerCase().includes(s)
      );
    }

    if (autoStatusFilter !== 'all') {
      result = result.filter((r) => r.debt_status_auto === autoStatusFilter);
    }

    if (minDebt !== '') {
      const min = parseFloat(minDebt);
      if (!isNaN(min)) {
        result = result.filter((r) => (r.totalDebt || 0) >= min);
      }
    }

    if (maxDebt !== '') {
      const max = parseFloat(maxDebt);
      if (!isNaN(max)) {
        result = result.filter((r) => (r.totalDebt || 0) <= max);
      }
    }

    if (ownerNameFilter) {
      const s = ownerNameFilter.toLowerCase();
      result = result.filter((r) => r.ownerName?.toLowerCase().includes(s));
    }

    if (phoneFilter) {
      const s = phoneFilter.toLowerCase();
      result = result.filter((r) =>
        r.phonePrimary?.toLowerCase().includes(s) ||
        r.phoneOwner?.toLowerCase().includes(s) ||
        r.phoneTenant?.toLowerCase().includes(s)
      );
    }

    if (legalStatusFilter && legalStatusFilter !== 'all') {
      if (legalStatusFilter === 'null') {
        result = result.filter((r) => !r.legal_status_id);
      } else {
        result = result.filter((r) => r.legal_status_id === legalStatusFilter);
      }
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'apartmentNumber') {
        const aNum = parseInt(normApt(aVal)) || 0;
        const bNum = parseInt(normApt(bVal)) || 0;
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      }

      if (sortField === 'legal_status_id') {
        const aStatus = getLegalStatusForRecord(a);
        const bStatus = getLegalStatusForRecord(b);
        const aName = aStatus?.name || 'zzz';
        const bName = bStatus?.name || 'zzz';
        return sortDir === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      aVal = aVal || '';
      bVal = bVal || '';
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return result;
  }, [records, search, apartmentSearch, autoStatusFilter, sortField, sortDir, minDebt, maxDebt, ownerNameFilter, phoneFilter, legalStatusFilter, allStatuses]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const clearFilters = () => {
    setAutoStatusFilter('all');
    setSearch('');
    setApartmentSearch('');
    setMinDebt('');
    setMaxDebt('');
    setOwnerNameFilter('');
    setPhoneFilter('');
    setLegalStatusFilter('all');
    setPage(1);
  };

  return {
    search,
    setSearch,
    apartmentSearch,
    setApartmentSearch,
    autoStatusFilter,
    setAutoStatusFilter,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    page,
    setPage,
    minDebt,
    setMinDebt,
    maxDebt,
    setMaxDebt,
    ownerNameFilter,
    setOwnerNameFilter,
    phoneFilter,
    setPhoneFilter,
    legalStatusFilter,
    setLegalStatusFilter,
    filteredRecords,
    toggleSort,
    clearFilters,
    getLegalStatusForRecord,
    legalStatuses,
  };
}