let hasBranchSupport = true;

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

const applyScope = (queryBuilder, req, options = {}) => {
  const scope = getScope(req);
  const branchCol = options.branchColumn || 'branch_id';
  const hoCol = options.headOfficeColumn || 'head_office_id';

  if (!hasBranchSupport && !scope.isSuperAdmin) {
    return queryBuilder.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  const rawBranchId = req.query?.branch_id || req.headers?.['x-branch-id'];
  const rawHoId = req.query?.head_office_id || req.headers?.['x-head-office-id'];

  const isValidId = (val) => val && typeof val === 'string' && val.trim() !== '' && val !== 'all' && val !== 'global' && val !== 'null' && val !== 'undefined';

  const selectedBranchId = isValidId(rawBranchId) ? rawBranchId.trim() : null;
  const selectedHoId = isValidId(rawHoId) ? rawHoId.trim() : null;

  if (scope.isSuperAdmin) {
    if (selectedBranchId) {
      return queryBuilder.eq(branchCol, selectedBranchId);
    }
    if (selectedHoId) {
      return queryBuilder.eq(hoCol, selectedHoId);
    }
    return queryBuilder;
  }

  if (scope.isHoAdmin) {
    if (scope.userHeadOfficeId) {
      queryBuilder = queryBuilder.eq(hoCol, scope.userHeadOfficeId);
    } else {
      queryBuilder = queryBuilder.eq(hoCol, '00000000-0000-0000-0000-000000000000');
    }
    if (selectedBranchId) {
      queryBuilder = queryBuilder.eq(branchCol, selectedBranchId);
    }
    return queryBuilder;
  }

  if (scope.isBranchScoped) {
    if (scope.userBranchId) {
      return queryBuilder.eq(branchCol, scope.userBranchId);
    }
    return queryBuilder.eq(branchCol, '00000000-0000-0000-0000-000000000000');
  }

  return queryBuilder;
};

const resolveCreateScope = (req, payload = {}) => {

  const isValidId = (val) => val && typeof val === 'string' && val.trim() !== '' && val !== 'all' && val !== 'global' && val !== 'null' && val !== 'undefined';
  const rawBranchId = payload.branch_id || req.headers?.['x-branch-id'];
  const rawHoId = payload.head_office_id || req.headers?.['x-head-office-id'];

  const scope = getScope(req);
  const selectedBranchId = isValidId(rawBranchId) ? rawBranchId.trim() : null;
  const selectedHoId = isValidId(rawHoId) ? rawHoId.trim() : null;

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
