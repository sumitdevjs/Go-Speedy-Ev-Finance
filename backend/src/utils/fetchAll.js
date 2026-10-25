// Never return partial financial data after a page error. Offset advances by
// actual rows so a provider row cap smaller than our requested page still works.
async function fetchAll(buildQuery) {
  const rows = [];
  for (;;) {
    const { data, error } = await buildQuery().order('id', { ascending: true }).range(rows.length, rows.length + 499);
    if (error) throw error;
    if (!data?.length) return rows;
    rows.push(...data);
  }
}
module.exports = { fetchAll };
