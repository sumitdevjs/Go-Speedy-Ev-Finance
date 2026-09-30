import * as XLSX from 'xlsx';

/**
 * Helper utility to export JSON data to an Excel file.
 * @param {Array} data - Array of objects to be exported
 * @param {String} filename - Name of the output excel file
 */
export const exportToExcel = (data, filename = 'export.xlsx') => {
  if (!data || data.length === 0) {
    console.warn('No data provided for export');
    return;
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert the array of objects to a worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Append the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  // Generate an Excel file and trigger download
  XLSX.writeFile(workbook, filename);
};
