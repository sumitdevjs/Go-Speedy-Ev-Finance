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

module.exports = { buildSearchFilter };
