const buildSearchFilter = (columns, term) => {
  const escaped = String(term).replace(/"/g, '\\"');
  const value = `"%${escaped}%"`;
  return columns.map((col) => `${col}.ilike.${value}`).join(',');
};

const escapeFilterValue = (value) => `"${String(value).replace(/"/g, '\\"')}"`;

const buildEqOrFilter = (fieldValues) =>
  Object.entries(fieldValues)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([field, value]) => `${field}.eq.${escapeFilterValue(value)}`)
    .join(',');

module.exports = { buildSearchFilter, escapeFilterValue, buildEqOrFilter };
