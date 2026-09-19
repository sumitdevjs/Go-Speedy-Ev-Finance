const { applyScope, resolveCreateScope } = require('../../src/middleware/scope');

describe('Data Scoping and Multi-Tenant Isolation', () => {
  // Mock query builder mimicking Supabase/PostgREST chain
  const createMockQuery = () => {
    const filters = [];
    const q = {
      eq: jest.fn((col, val) => {
        filters.push({ op: 'eq', col, val });
        return q;
      }),
      _getFilters: () => filters,
    };
    return q;
  };

  describe('applyScope', () => {
    test('super_admin with no filters receives unscoped query (global view)', () => {
      const q = createMockQuery();
      const req = { user: { role: 'super_admin' }, query: {}, headers: {} };
      applyScope(q, req);
      expect(q.eq).not.toHaveBeenCalled();
    });

    test('super_admin with x-branch-id header scopes to that branch', () => {
      const q = createMockQuery();
      const req = {
        user: { role: 'super_admin' },
        query: {},
        headers: { 'x-branch-id': 'branch-del-01' },
      };
      applyScope(q, req);
      expect(q.eq).toHaveBeenCalledWith('branch_id', 'branch-del-01');
    });

    test('super_admin with query branch_id scopes to that branch', () => {
      const q = createMockQuery();
      const req = {
        user: { role: 'super_admin' },
        query: { branch_id: 'branch-noi-01' },
        headers: {},
      };
      applyScope(q, req);
      expect(q.eq).toHaveBeenCalledWith('branch_id', 'branch-noi-01');
    });

    test('ho_admin is scoped to their head_office_id by default', () => {
      const q = createMockQuery();
      const req = {
        user: { role: 'ho_admin', head_office_id: 'ho-delhi' },
        query: {},
        headers: {},
      };
      applyScope(q, req);
      expect(q.eq).toHaveBeenCalledWith('head_office_id', 'ho-delhi');
    });

    test('ho_admin can filter within their head office by branch_id', () => {
      const q = createMockQuery();
      const req = {
        user: { role: 'ho_admin', head_office_id: 'ho-delhi' },
        query: { branch_id: 'branch-del-05' },
        headers: {},
      };
      applyScope(q, req);
      expect(q.eq).toHaveBeenCalledWith('branch_id', 'branch-del-05');
      expect(q.eq).toHaveBeenCalledWith('head_office_id', 'ho-delhi');
    });

    test('branch_admin is strictly locked to their branch_id', () => {
      const q = createMockQuery();
      const req = {
        user: { role: 'branch_admin', branch_id: 'branch-rohini' },
        query: { branch_id: 'malicious-other-branch' }, // attempt to bypass
        headers: {},
      };
      applyScope(q, req);
      expect(q.eq).toHaveBeenCalledWith('branch_id', 'branch-rohini');
    });

    test('staff is strictly locked to their branch_id', () => {
      const q = createMockQuery();
      const req = {
        user: { role: 'staff', branch_id: 'branch-karol-bagh' },
        query: {},
        headers: {},
      };
      applyScope(q, req);
      expect(q.eq).toHaveBeenCalledWith('branch_id', 'branch-karol-bagh');
    });
  });

  describe('resolveCreateScope', () => {
    test('staff cannot spoof branch_id and is forced to their own branch', () => {
      const req = {
        user: { role: 'staff', branch_id: 'branch-staff-own', head_office_id: 'ho-delhi' },
      };
      const data = { branch_id: 'spoofed-branch', head_office_id: 'spoofed-ho' };
      const scope = resolveCreateScope(req, data);
      expect(scope.branch_id).toBe('branch-staff-own');
      expect(scope.head_office_id).toBe('ho-delhi');
    });

    test('super_admin can assign any branch_id and head_office_id', () => {
      const req = {
        user: { role: 'super_admin' },
      };
      const data = { branch_id: 'target-branch-42', head_office_id: 'target-ho-delhi' };
      const scope = resolveCreateScope(req, data);
      expect(scope.branch_id).toBe('target-branch-42');
      expect(scope.head_office_id).toBe('target-ho-delhi');
    });

    test('ho_admin is forced to their own head_office_id', () => {
      const req = {
        user: { role: 'ho_admin', head_office_id: 'ho-noida' },
      };
      const data = { branch_id: 'noi-br-01', head_office_id: 'spoofed-ho-delhi' };
      const scope = resolveCreateScope(req, data);
      expect(scope.branch_id).toBe('noi-br-01');
      expect(scope.head_office_id).toBe('ho-noida');
    });
  });
});
