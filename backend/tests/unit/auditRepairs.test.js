jest.mock('../../src/config/db', () => ({ from: jest.fn(), rpc: jest.fn() }));
const db = require('../../src/config/db');
const { setBranchSupportForTest } = require('../../src/middleware/scope');
const { fetchAll } = require('../../src/utils/fetchAll');
const customers = require('../../src/modules/customers/customers.service');
const penalties = require('../../src/modules/penalties/penalties.service');
const models = require('../../src/modules/models/models.service');
const bookings = require('../../src/modules/bookings/bookings.service');
const transfers = require('../../src/modules/transfers/transfers.service');
let tables;
let cap;
class Query {
  constructor(table) { this.table = table; this.filters = []; this.start = 0; this.end = 500; this.sorts = []; }
  select() { return this; }
  eq(key, val) { this.filters.push(row => row[key] === val); return this; }
  gt(key, val) { this.filters.push(row => row[key] > val); return this; }
  in(key, vals) { this.filters.push(row => vals.includes(row[key])); return this; }
  or(expression) {
    this.filters.push(row => expression.split(',').some(part => { const [key, , ...rest] = part.split('.'); return row[key] === JSON.parse(rest.join('.')); }));
    return this;
  }
  order(key, options = {}) { this.sorts.push([key, options.ascending !== false]); return this; }
  range(a, b) { this.start = a; this.end = b + 1; return this; }
  limit(n) { this.end = n; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { return this.single(); }
  then(resolve, reject) {
    let data = (tables[this.table] || []).filter(row => this.filters.every(f => f(row)));
    data.sort((a, b) => { for (const [key, asc] of this.sorts) { if (a[key] !== b[key]) return (a[key] > b[key] ? 1 : -1) * (asc ? 1 : -1); } return 0; });
    data = data.slice(this.start, Math.min(this.end, this.start + cap)).map(row => ({ ...row }));
    return Promise.resolve({ data: this.one ? data[0] : data, error: null }).then(resolve, reject);
  }
}
const own = '20000000-0000-4000-8000-000000000001';
const foreign = '20000000-0000-4000-8000-000000000002';
const req = () => ({ user: { role: 'staff', branch_id: 'A' }, headers: {}, query: {} });
beforeEach(() => {
  cap = 2; // Exercise a server cap smaller than the requested range.
  tables = {
    branches: [{ id: 'A', name: 'A', head_office_id: 'HO' }, { id: 'B', name: 'B', head_office_id: 'OTHER' }],
    tenants: [
      { id: foreign, phone: '9000000001', name: 'Foreign', branch_id: 'B', status: 'cancelled', address: 'PRIVATE', total_price: 10000 },
      { id: own, phone: '9000000001', name: 'Own', branch_id: 'A', status: 'rented', total_price: 10000 },
    ],
    audit_logs: [], payments: [],
    ev_models: [{ id: 'M', name: 'Synthetic', stock_count: 3, is_active: true, stock_logs: [{ branch_id: 'A', stock_added: 3 }] }],
    bookings: [{ id: 'BOOK', name: 'Synthetic booking', phone: '9000000002', branch_id: 'A', status: 'pending', ev_model_id: 'M' }],
  };
  db.from.mockImplementation(table => new Query(table));
  db.rpc.mockImplementation(async name => {
    if (name === 'model_stock_balances') return { data: [{ id: 'M', stock_count: 3, branches: { A: 0, B: 3 } }], error: null };
    return { data: { id: 'CREATED' }, error: null };
  });
  setBranchSupportForTest(true);
});

it('transfer responses preserve the flat model and branch labels used by list, search and detail views', async () => {
  tables.bike_transfers = [
    { id: 'TR1', transfer_id: 'LOCAL-1', ev_model_id: 'M', from_branch_id: 'A', to_branch_id: 'B', details: {} },
    { id: 'TR2', transfer_id: 'LOCAL-2', ev_model_id: 'M', from_branch_id: 'A', to_branch_id: 'B', details: { model_name: 'Original model', from_branch_name: 'Original A', to_branch_name: 'Original B' } },
  ];
  tables.ev_models[0].name = 'Current model';
  tables.branches[0].name = 'Current A';
  tables.branches[1].name = 'Current B';
  const result = await transfers.getTransfers({}, { user: { role: 'super_admin' } });
  expect(result.find(t => t.id === 'TR1')).toMatchObject({ model_name: 'Current model', from_branch_name: 'Current A', to_branch_name: 'Current B' });
  expect(result.find(t => t.id === 'TR2')).toMatchObject({ model_name: 'Original model', from_branch_name: 'Original A', to_branch_name: 'Original B' });
});

it('customer phone lookup never selects a foreign profile when ward metadata is absent', async () => {
  const result = await customers.getCustomerDetails('9000000001', req());
  expect(result.profile.id).toBe(own);
  expect(result.profile.address).not.toBe('PRIVATE');
  expect(result.contracts.map(t => t.id)).toEqual([own]);
});
it('foreign customer UUID and unassigned staff are denied', async () => {
  await expect(customers.getCustomerDetails(foreign, req())).rejects.toThrow(/access denied/);
  const unassigned = req(); unassigned.user.branch_id = null;
  await expect(customers.getCustomerDetails('9000000001', unassigned)).rejects.toThrow(/access denied/);
});
it('customer aggregation pages through all authorized contracts/payments', async () => {
  tables.tenants = Array.from({ length: 5 }, (_, i) => ({ ...tables.tenants[1], id: String(i), phone: `900000000${i}` }));
  tables.payments = tables.tenants.map(t => ({ id: 'P' + t.id, tenant_id: t.id, amount: 100, branch_id: 'A' }));
  const result = await customers.getCustomers({}, req());
  expect(result.data).toHaveLength(5);
  expect(result.data.every(c => c.total_paid === 100)).toBe(true);
});
it('penalty filters apply after deduplication and before summary totals', async () => {
  tables.audit_logs = [
    { id: 'L1', entity_type: 'penalty', created_at: '2026-10-25', changes: { penalty_id: 'ONE', tenant_id: own, branch_id: 'A', amount: 50, status: 'unpaid' } },
    { id: 'L2', entity_type: 'penalty', created_at: '2026-10-25', changes: { penalty_id: 'TWO', tenant_id: foreign, branch_id: 'B', amount: 500, status: 'waived' } },
  ];
  const result = await penalties.getPenalties({ tenant_id: own, status: 'unpaid' }, { user: { role: 'super_admin' } });
  expect(result.data.map(p => p.penalty_id)).toEqual(['ONE']);
  expect(result.summary.total_amount).toBe(50);
  const all = await penalties.getPenalties({ status: 'all' }, req());
  expect(all.data).toHaveLength(1);
});
it('paging handles provider row caps and propagates page failures', async () => {
  tables.payments = Array.from({ length: 5 }, (_, i) => ({ id: String(i) }));
  expect(await fetchAll(() => db.from('payments').select('*'))).toHaveLength(5);
  let pages = 0;
  await expect(fetchAll(() => ({ order() { return this; }, range() { pages++; return Promise.resolve(pages === 1 ? { data: [{ id: '1' }] } : { error: new Error('page failed') }); } }))).rejects.toThrow('page failed');
  expect(pages).toBe(2);
});
it('list, detail, dropdown and ward matrix use the same current branch balance', async () => {
  const r = req(); r.headers['x-branch-id'] = 'B';
  expect((await models.getAllModels({}, r)).data[0].stock_count).toBe(0);
  expect((await models.getModelById('M', r)).stock_count).toBe(0);
  expect((await models.getAllModelsForDropdown(r))[0].stock_count).toBe(0);
  const matrix = await models.getWardStockBreakdown({}, r.user);
  expect(matrix).toHaveLength(1);
  expect(matrix[0].available_stock).toBe(0);
  expect(matrix[0].models[0].stock).toBe(0);
  const unassigned = req(); unassigned.user.branch_id = null;
  await expect(models.getAllModelsForDropdown(unassigned)).rejects.toThrow(/No assigned branch/);
});
it('booking conversion uses one transactional RPC and propagates a database failure', async () => {
  await bookings.convertBooking('BOOK', { gender: 'male' }, 'ACTOR', req());
  expect(db.rpc).toHaveBeenLastCalledWith('create_contract', expect.objectContaining({ p_actor: 'ACTOR', p_booking: 'BOOK', p_tenant: expect.objectContaining({ ev_model_id: 'M', name: 'Synthetic booking' }) }));
  db.rpc.mockResolvedValueOnce({ error: new Error('database transaction failed') });
  await expect(bookings.convertBooking('BOOK', { gender: 'male' }, 'ACTOR', req())).rejects.toThrow('database transaction failed');
});

it('hardware uniqueness checks ignore cancelled history and still reject issued hardware', async () => {
  const rentals = require('../../src/modules/rentals/rentals.service');
  tables.tenants = [{ id: 'C', status: 'cancelled', chassis_no: 'REUSABLE' }, { id: 'A', status: 'rented', chassis_no: 'ISSUED' }];
  expect(await rentals.checkUniqueHardwareOrPolicy({ chassis_no: 'REUSABLE' })).toEqual({ exists: false });
  expect((await rentals.checkUniqueHardwareOrPolicy({ chassis_no: 'ISSUED' })).exists).toBe(true);
});

it('missing branch assignments cannot read rentals/payments or deactivate unassigned staff', async () => {
  const rentals = require('../../src/modules/rentals/rentals.service');
  const payments = require('../../src/modules/payments/payments.service');
  const staff = require('../../src/modules/staff/staff.service');
  const unassigned = req(); unassigned.user.branch_id = null;
  await expect(rentals.getRentalById(own, unassigned)).rejects.toThrow(/Access denied/);
  await expect(payments.getPayments(own, unassigned)).rejects.toThrow(/Access denied/);
  tables.users = [{ id: 'TARGET', role: 'staff', branch_id: null, is_active: true }];
  await expect(staff.toggleActive('TARGET', false, { id: 'ACTOR', role: 'branch_admin', branch_id: 'A' })).rejects.toThrow(/Access denied/);
});
