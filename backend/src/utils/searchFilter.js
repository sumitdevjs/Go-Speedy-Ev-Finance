/**
 * Build a PostgREST `.or()` filter string that ILIKE-matches `term` against
 * multiple columns, e.g. buildSearchFilter(['name', 'phone'], 'ramesh')
 *   -> 'name.ilike."%ramesh%",phone.ilike."%ramesh%"'
 *
 * The value is wrapped in double quotes (with any embedded double quotes
 * escaped) so a search term containing a comma or parenthesis can't break
 * out of the `.or()` filter syntax.
 */
const buildSearchFilter = (columns, term) => {
  const escaped = String(term).replace(/"/g, '\\"');
  const value = `"%${escaped}%"`;
  return columns.map((col) => `${col}.ilike.${value}`).join(',');
};

// Same escaping as buildSearchFilter, exposed for other operators (`.eq.`).
const escapeFilterValue = (value) => `"${String(value).replace(/"/g, '\\"')}"`;

// Build a PostgREST `.or()` filter that equality-matches distinct values
// against distinct columns, e.g. buildEqOrFilter({chassis_no: 'ABC123'})
// -> 'chassis_no.eq."ABC123"'. Skips null/undefined/empty values.
const buildEqOrFilter = (fieldValues) =>
  Object.entries(fieldValues)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([field, value]) => `${field}.eq.${escapeFilterValue(value)}`)
    .join(',');

module.exports = { buildSearchFilter, escapeFilterValue, buildEqOrFilter };
