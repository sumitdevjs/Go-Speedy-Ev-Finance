/**
 * Scoping middleware & query helpers for Multi-Branch and Head-Office Hierarchy
 */

let hasBranchSupport = false;

const checkBranchSupport = async () => {
  try {
    const supabase = require('../config/db');
    const { error } = await supabase.from('branches').select('id').limit(1);
    hasBranchSupport = !error || (error.code !== 'PGRST205' && error.code !== '42P01');
  } catch {
    hasBranchSupport = false;
  }
  return hasBranchSupport;
};

// Initial check and periodic background refresh
checkBranchSupport();
const branchTimer = setInterval(checkBranchSupport, 30000);
if (branchTimer.unref) branchTimer.unref();

const getScope = (req) => {
  const user = req.user || {};
  const role = user.role;
  const isSuperAdmin = role === 'super_admin' || role === 'admin';
  const isHoAdmin = role === 'ho_admin';
  const isBranchScoped = role === 'branch_admin' || role === 'staff';

  return {
    user,
    role,
    isSuperAdmin,
    isHoAdmin,
    isBranchScoped,
    userHeadOfficeId: user.head_office_id,
    userBranchId: user.branch_id,
  };
};

/**
 * Automatically applies scoping filters to a Supabase query builder based on the authenticated user's role.
 *
 * @param {Object} queryBuilder - Supabase query builder instance
 * @param {Object} req - Express request object
 * @param {Object} options - Scoping options (e.g. tableName, overrideBranchId)
 * @returns {Object} queryBuilder with filters applied
 */
const applyScope = (queryBuilder, req, options = {}) => {
  if (!hasBranchSupport) {
    return queryBuilder;
  }

  const scope = getScope(req);
  const branchCol = options.branchColumn || 'branch_id';
  const hoCol = options.headOfficeColumn || 'head_office_id';

  const selectedBranchId = req.query?.branch_id || req.headers?.['x-branch-id'];
  const selectedHoId = req.query?.head_office_id || req.headers?.['x-head-office-id'];

  // 1. Super Admin: full access, with optional query/header filters
  if (scope.isSuperAdmin) {
    if (selectedBranchId) {
      return queryBuilder.eq(branchCol, selectedBranchId);
    }
    if (selectedHoId) {
      return queryBuilder.eq(hoCol, selectedHoId);
    }
    return queryBuilder;
  }

  // 2. HO Admin: strictly scoped to their assigned head office
  if (scope.isHoAdmin) {
    if (scope.userHeadOfficeId) {
      queryBuilder = queryBuilder.eq(hoCol, scope.userHeadOfficeId);
    }
    if (selectedBranchId) {
      queryBuilder = queryBuilder.eq(branchCol, selectedBranchId);
    }
    return queryBuilder;
  }

  // 3. Branch Admin & Staff: strictly scoped to their assigned branch/ward
  if (scope.isBranchScoped && scope.userBranchId) {
    return queryBuilder.eq(branchCol, scope.userBranchId);
  }

  return queryBuilder;
};

/**
 * Resolves the branch_id and head_office_id when creating a new record.
 * Ensures staff cannot spoof another branch.
 */
const resolveCreateScope = (req, payload = {}) => {
  if (!hasBranchSupport) {
    return { branch_id: null, head_office_id: null };
  }

  const scope = getScope(req);
  const selectedBranchId = payload.branch_id || req.headers?.['x-branch-id'];
  const selectedHoId = payload.head_office_id || req.headers?.['x-head-office-id'];

  if (scope.isSuperAdmin) {
    return {
      branch_id: selectedBranchId || scope.userBranchId || null,
      head_office_id: selectedHoId || scope.userHeadOfficeId || null,
    };
  }

  if (scope.isHoAdmin) {
    return {
      branch_id: selectedBranchId || scope.userBranchId || null,
      head_office_id: scope.userHeadOfficeId || null,
    };
  }

  // Branch Admin & Staff are forced to their assigned branch & HO
  return {
    branch_id: scope.userBranchId || null,
    head_office_id: scope.userHeadOfficeId || null,
  };
};

const isBranchSupported = () => hasBranchSupport;
const setBranchSupportForTest = (val) => { hasBranchSupport = val; };

module.exports = {
  getScope,
  applyScope,
  resolveCreateScope,
  isBranchSupported,
  checkBranchSupport,
  setBranchSupportForTest,
};
