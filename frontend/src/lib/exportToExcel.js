import * as XLSX from 'xlsx';

/**
 * Universal export utility to export JSON data to an Excel (.xlsx) or CSV (.csv) file with auto-calculated column widths.
 * @param {Array} data - Array of objects to be exported
 * @param {String} filename - Name of the output file
 * @param {'xlsx' | 'csv'} format - File format ('xlsx' or 'csv')
 */
export const exportToSpreadsheet = (data, filename = 'export', format = 'xlsx') => {
  if (!data || data.length === 0) {
    return;
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert the array of objects to a worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-fit column widths based on maximum length in each column
  const headers = Object.keys(data[0] || {});
  const colWidths = headers.map(header => {
    let maxLen = header.length;
    const sampleSize = Math.min(data.length, 500);
    for (let i = 0; i < sampleSize; i++) {
      const val = data[i][header];
      if (val !== null && val !== undefined) {
        maxLen = Math.max(maxLen, String(val).length);
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 12), 60) };
  });
  worksheet['!cols'] = colWidths;

  const ext = format === 'csv' ? 'csv' : 'xlsx';
  const cleanName = filename.replace(/\.(xlsx|csv)$/i, '');
  const finalFilename = `${cleanName}.${ext}`;

  // Append the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  // Generate file and trigger download
  XLSX.writeFile(workbook, finalFilename, { bookType: ext });
};

/**
 * Export to Excel (.xlsx) format
 */
export const exportToExcel = (data, filename = 'export.xlsx') => {
  exportToSpreadsheet(data, filename, 'xlsx');
};

/**
 * Export to CSV (.csv) format
 */
export const exportToCsv = (data, filename = 'export.csv') => {
  exportToSpreadsheet(data, filename, 'csv');
};

/**
 * Helper to filter records by common date presets (like a bank statement) or custom date range
 * @param {Array} records - List of records
 * @param {String|Function} dateAccessor - Field name or function returning ISO date string
 * @param {String} preset - 'all' | 'today' | 'this_month' | 'last_month' | '3_months' | '6_months' | 'this_year' | 'custom'
 * @param {String} [customFrom] - YYYY-MM-DD
 * @param {String} [customTo] - YYYY-MM-DD
 */
export const filterRecordsByDateRange = (records, dateAccessor, preset = 'all', customFrom = '', customTo = '') => {
  if (!Array.isArray(records) || records.length === 0 || preset === 'all') {
    return records;
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const getDateStr = (item) => {
    if (typeof dateAccessor === 'function') {
      const val = dateAccessor(item);
      return val ? String(val).split('T')[0] : null;
    }
    const val = item[dateAccessor];
    return val ? String(val).split('T')[0] : null;
  };

  let startDateStr = null;
  let endDateStr = todayStr;

  if (preset === 'today') {
    startDateStr = todayStr;
    endDateStr = todayStr;
  } else if (preset === 'this_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startDateStr = startOfMonth.toISOString().split('T')[0];
  } else if (preset === 'last_month') {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    startDateStr = startOfLastMonth.toISOString().split('T')[0];
    endDateStr = endOfLastMonth.toISOString().split('T')[0];
  } else if (preset === '3_months') {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    startDateStr = d.toISOString().split('T')[0];
  } else if (preset === '6_months') {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    startDateStr = d.toISOString().split('T')[0];
  } else if (preset === 'this_year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    startDateStr = startOfYear.toISOString().split('T')[0];
  } else if (preset === 'custom') {
    startDateStr = customFrom || null;
    endDateStr = customTo || null;
  }

  return records.filter(item => {
    const itemDate = getDateStr(item);
    if (!itemDate) return false;
    if (startDateStr && itemDate < startDateStr) return false;
    if (endDateStr && itemDate > endDateStr) return false;
    return true;
  });
};

/**
 * Robustly fetches ALL records across pages in chunks to avoid Supabase row limits.
 * @param {Object} api - Axios api instance
 * @param {String} endpoint - API route (e.g. '/api/rentals')
 * @param {Object} params - Query parameters
 * @param {Number} chunkSize - Number of records per request (default: 250)
 * @returns {Promise<Array>} Complete list of records
 */
export const fetchAllForExport = async (api, endpoint, params = {}, chunkSize = 250) => {
  let allRecords = [];
  let currentPage = 1;
  let hasMore = true;
  const maxPages = 40; // Safety limit: up to 10,000 records

  while (hasMore && currentPage <= maxPages) {
    const res = await api.get(endpoint, {
      params: {
        ...params,
        page: currentPage,
        limit: chunkSize,
        _t: Date.now(),
      },
    });

    if (res.data?.success && Array.isArray(res.data.data)) {
      const records = res.data.data;
      allRecords = allRecords.concat(records);

      const totalPages =
        res.data.pagination?.totalPages ||
        res.data.meta?.totalPages ||
        1;

      if (currentPage >= totalPages || records.length < chunkSize) {
        hasMore = false;
      } else {
        currentPage++;
      }
    } else {
      hasMore = false;
    }
  }

  return allRecords;
};
