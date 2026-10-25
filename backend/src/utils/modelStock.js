const supabase = require('../config/db');

async function loadModelStock(models) {
  const balances = new Map();
  for (let i = 0; i < models.length; i += 100) {
    const { data, error } = await supabase.rpc('model_stock_balances', { p_models: models.slice(i, i + 100).map(m => m.id) });
    if (error) throw error;
    for (const row of data || []) balances.set(row.id, row);
  }
  return balances;
}

function presentModelStock(model, branch, branches, balances) {
  const balance = balances.get(model.id);
  if (!balance) throw new Error('Missing inventory balance');
  const total = Number(balance.stock_count) || 0;
  model.total_global_stock = total;
  model.stock_count = branch ? Number(balance.branches[branch.id]) || 0 : total;
  model.scoped_ward = branch ? { id: branch.id, name: branch.name, ward_no: branch.ward_no } : null;
  model.ward_stock_summary = branches.map(b => ({
    ward_label: b.ward_no ? `Ward ${b.ward_no}: ${b.name}` : b.name,
    stock: Number(balance.branches[b.id]) || 0,
  }));
  return model;
}
module.exports = { loadModelStock, presentModelStock };
