const supabase = require('../../config/db');
const { calcBalance } = require('../../utils/balanceCalc');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
const { buildSearchFilter, buildEqOrFilter } = require('../../utils/searchFilter');
const { applyScope, resolveCreateScope } = require('../../middleware/scope');

class RentalsService {
  async getRentals(query = {}, req = null) {
    const { page, limit, offset } = getPaginationOptions(query);

    let queryBuilder = supabase
      .from('tenants')
      .select('*, ev_models(name, company, total_price, kilometres), users!tenants_created_by_fkey(name)', { count: 'exact' });

    if (req) {
      queryBuilder = applyScope(queryBuilder, req);
    }

    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    } else {
      queryBuilder = queryBuilder.neq('status', 'cancelled');
      queryBuilder = queryBuilder.neq('status', 'completed');
      queryBuilder = queryBuilder.neq('status', 'direct_purchase');
    }

    if (query.search) {
      queryBuilder = queryBuilder.or(buildSearchFilter(['name', 'phone'], query.search));
    }

    if (query.has_pending_docs !== undefined && query.has_pending_docs !== '') {
      queryBuilder = queryBuilder.eq('has_pending_docs', query.has_pending_docs === 'true');
    }

    if (query.insurance_status) {
      const today = new Date().toISOString().split('T')[0];
      if (query.insurance_status === 'scooty_expired') {
        queryBuilder = queryBuilder.lt('scooty_policy_expiry', today);
      } else if (query.insurance_status === 'scooty_not_expired') {
        queryBuilder = queryBuilder.gte('scooty_policy_expiry', today);
      } else if (query.insurance_status === 'rider_expired') {
        queryBuilder = queryBuilder.lt('rider_policy_expiry', today);
      } else if (query.insurance_status === 'rider_not_expired') {
        queryBuilder = queryBuilder.gte('rider_policy_expiry', today);
      }
    }

    const { data: tenants, count, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    if (tenants && tenants.some(t => t.branch_id)) {
      try {
        const branchIds = [...new Set(tenants.map(t => t.branch_id).filter(Boolean))];
        if (branchIds.length > 0) {
          const { data: bList } = await supabase.from('branches').select('id, name, code, ward_no').in('id', branchIds);
          const bMap = new Map((bList || []).map(b => [b.id, b]));
          tenants.forEach(t => { if (t.branch_id) t.branch = bMap.get(t.branch_id) || null; });
        }
      } catch (e) { }
    }

    const tenantIds = tenants.map(t => t.id);
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('tenant_id, amount')
      .in('tenant_id', tenantIds);

    if (paymentsError) throw paymentsError;

    const paymentsByTenant = payments.reduce((acc, p) => {
      acc[p.tenant_id] = (acc[p.tenant_id] || 0) + Number(p.amount);
      return acc;
    }, {});

    const enrichedData = tenants.map(tenant => {
      const totalPaid = paymentsByTenant[tenant.id] || 0;
      const balance = calcBalance(tenant, totalPaid);
      return {
        ...tenant,
        computed_balance: balance
      };
    });

    let finalData = enrichedData;
    if (query.overdue_days) {
      const minOverdue = parseInt(query.overdue_days);
      finalData = finalData.filter(t => t.computed_balance.daysOverdue >= minOverdue);
    }

    const meta = getPaginationMeta(count, page, limit);
    return { data: finalData, meta };
  }

  async getRentalById(id, req = null) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*, ev_models(name, company, kilometres)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!tenant) throw new Error('Rental not found');

    if (req?.user) {
      const user = req.user;
      if (user.role === 'branch_admin' || user.role === 'staff') {
        if (tenant.branch_id && user.branch_id && tenant.branch_id !== user.branch_id) {
          throw new Error('Access denied: Rental belongs to another branch');
        }
      } else if (user.role === 'ho_admin') {
        if (tenant.head_office_id && user.head_office_id && tenant.head_office_id !== user.head_office_id) {
          throw new Error('Access denied: Rental belongs to another Head Office');
        }
      }
    }

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('tenant_id', id);

    if (paymentsError) throw paymentsError;

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = calcBalance(tenant, totalPaid);

    return { ...tenant, computed_balance: balance, total_paid: totalPaid };
  }

  async createRental(tenantData, createdBy, req = null) {
    Object.keys(tenantData).forEach(key => {
      if (tenantData[key] === '') {
        delete tenantData[key];
      }
    });

    delete tenantData.include_gst;
    delete tenantData.gst_percent;

    const requiredFields = [
      'vehicle_number',
      'scooty_insurance_amount', 'scooty_insurance_idv', 'scooty_insurance_start',
      'rider_insurance_amount', 'rider_insurance_idv', 'rider_insurance_start',
      'buyback_amount',
    ];
    for (const field of requiredFields) {
      if (!tenantData[field] && tenantData[field] !== 0) {
        throw new Error(`Field ${field} is required`);
      }
    }

    let assignedBranchId = tenantData.branch_id || null;
    let assignedHoId = tenantData.head_office_id || null;

    if (req) {
      const scope = resolveCreateScope(req, tenantData);
      assignedBranchId = scope.branch_id;
      assignedHoId = scope.head_office_id;
    }

    if (tenantData.phone) {
      const { data: existingActive } = await supabase
        .from('tenants')
        .select('id')
        .eq('phone', tenantData.phone)
        .eq('status', 'rented')
        .maybeSingle();

      if (existingActive) {
        throw new Error('This person already has an active rental contract. Cannot create a new one.');
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (tenantData.status !== 'direct_purchase' && tenantData.start_date) {
      const sDate = tenantData.start_date.split('T')[0];
      if (sDate < todayStr) {
        throw new Error('Contract Start Date cannot be in the past (back date not allowed).');
      }
    }

    if (tenantData.amc_start_date) {
      const amcStart = tenantData.amc_start_date.split('T')[0];
      if (amcStart < todayStr) {
        throw new Error('AMC Start Date cannot be in the past (back date not allowed).');
      }
      if (tenantData.amc_expire_date) {
        const amcExpire = tenantData.amc_expire_date.split('T')[0];
        if (amcExpire <= amcStart) {
          throw new Error('AMC Expire Date must be strictly after AMC Start Date.');
        }
      }
    }

    let modelTotalPrice = 0;
    let originalStockCount = 0;
    const isOldEv = Boolean(tenantData.old_ev_id);

    if (isOldEv) {
      const { data: oldEv, error: oldEvErr } = await supabase
        .from('old_evs')
        .select('*')
        .eq('id', tenantData.old_ev_id)
        .single();

      if (oldEvErr || !oldEv) throw new Error('Selected used EV not found');
      if (oldEv.status !== 'available') throw new Error('Selected used EV is no longer available');

      modelTotalPrice = Number(oldEv.price) || 0;

      const { data: updatedOldEv, error: oldEvUpdateErr } = await supabase
        .from('old_evs')
        .update({ status: tenantData.status === 'direct_purchase' ? 'sold' : 'rented' })
        .eq('id', tenantData.old_ev_id)
        .eq('status', 'available')
        .select('id');

      if (oldEvUpdateErr || !updatedOldEv || updatedOldEv.length === 0) {
        throw new Error('Selected used EV is no longer available');
      }
    } else {
      const { data: model, error: modelError } = await supabase
        .from('ev_models')
        .select('total_price, stock_count')
        .eq('id', tenantData.ev_model_id)
        .single();

      if (modelError || !model) throw new Error('EV Model not found');
      if (model.stock_count <= 0) throw new Error('EV Model out of stock');

      originalStockCount = model.stock_count;

      const { data: updatedStock, error: stockError } = await supabase
        .from('ev_models')
        .update({ stock_count: model.stock_count - 1 })
        .eq('id', tenantData.ev_model_id)
        .gt('stock_count', 0)
        .select('id, stock_count');

      if (stockError || !updatedStock || updatedStock.length === 0) {
        throw new Error('EV Model out of stock');
      }
      modelTotalPrice = model.total_price;
    }

    const startDate = tenantData.start_date ? new Date(tenantData.start_date) : new Date();
    const totalMonths = Number(tenantData.total_months) || 24;
    const expectedEndDate = new Date(startDate);
    expectedEndDate.setMonth(expectedEndDate.getMonth() + totalMonths);

    if (tenantData.status === 'direct_purchase') {
      tenantData.installment_daily_rate = 0;
      tenantData.installment_frequency = tenantData.installment_frequency || 'daily';
      tenantData.downpayment_paid = tenantData.downpayment_paid ?? 0;
      tenantData.booking_amount = tenantData.booking_amount ?? 0;
    } else {
      tenantData.installment_daily_rate = tenantData.installment_daily_rate ?? 0;
      tenantData.installment_frequency = tenantData.installment_frequency || 'daily';
    }

    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert([{
          ...tenantData,
          branch_id: assignedBranchId,
          head_office_id: assignedHoId,
          late_fee_daily_rate: tenantData.late_fee_daily_rate || 50.00,
          references: tenantData.references || [],
          guarantors: tenantData.guarantors || [],
          total_price: tenantData.total_price || modelTotalPrice,
          start_date: tenantData.status === 'direct_purchase' ? null : startDate.toISOString().split('T')[0],
          expected_end_date: tenantData.status === 'direct_purchase' ? null : expectedEndDate.toISOString().split('T')[0],
          created_by: createdBy
        }])
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      if (!isOldEv && tenantData.ev_model_id) {
        const { data: freshModel } = await supabase
          .from('ev_models')
          .select('stock_count')
          .eq('id', tenantData.ev_model_id)
          .single();
        if (freshModel) {
          await supabase
            .from('ev_models')
            .update({ stock_count: (Number(freshModel.stock_count) || 0) + 1 })
            .eq('id', tenantData.ev_model_id);
        }
      } else if (isOldEv && tenantData.old_ev_id) {
        await supabase
          .from('old_evs')
          .update({ status: 'available' })
          .eq('id', tenantData.old_ev_id);
      }

      if (error.code === '23505') {
        console.error('[createRental] Unique constraint violation:', error);
        throw new Error('Unique constraint violation: a record with this value already exists.');
      }
      throw error;
    }
  }

  async updateRental(id, updates, req = null) {
    if (req?.user) {
      const user = req.user;
      const { data: existing } = await supabase
        .from('tenants')
        .select('branch_id, head_office_id')
        .eq('id', id)
        .single();

      if (existing) {
        if (user.role === 'branch_admin' || user.role === 'staff') {
          if (existing.branch_id && user.branch_id && existing.branch_id !== user.branch_id) {
            throw new Error('Access denied: Rental belongs to another branch');
          }
        } else if (user.role === 'ho_admin') {
          if (existing.head_office_id && user.head_office_id && existing.head_office_id !== user.head_office_id) {
            throw new Error('Access denied: Rental belongs to another Head Office');
          }
        }
      }
    }

    if (updates && 'status' in updates) {
      throw new Error('status cannot be changed via a generic update — use the /complete or /cancel endpoints.');
    }

    const ALLOWED_UPDATE_FIELDS = new Set([
      'name', 'phone', 'gender', 'address', 'vehicle_number', 'chassis_no',
      'battery_number', 'charger_number', 'key_number', 'start_date', 'total_months',
      'amc_start_date', 'amc_expire_date', 'scooty_insurance_start', 'scooty_policy_expiry',
      'rider_insurance_start', 'rider_policy_expiry', 'has_pending_docs', 'notes',
      'invoice_generated', 'invoice_doc_path', 'aadhar_path', 'pan_path', 'cheque_path',
      'electricity_bill_path', 'tenant_photo_path', 'scooty_photo_path',
      'rent_agreement_path', 'scooty_insurance_path', 'rider_insurance_path',
      'rider_license_path', 'verification_doc', 'expected_end_date'
    ]);

    const sanitizedUpdates = {};
    for (const [key, val] of Object.entries(updates)) {
      if (ALLOWED_UPDATE_FIELDS.has(key)) {
        sanitizedUpdates[key] = val === '' ? null : val;
      }
    }
    updates = sanitizedUpdates;

    const todayStr = new Date().toISOString().split('T')[0];

    const needsExistingCheck = updates.amc_start_date !== undefined || updates.amc_expire_date !== undefined || updates.start_date !== undefined || updates.scooty_policy_expiry !== undefined || updates.rider_policy_expiry !== undefined;
    let existingTenant = null;
    if (needsExistingCheck) {
      const { data: ex } = await supabase
        .from('tenants')
        .select('start_date, amc_start_date, amc_expire_date, scooty_insurance_start, scooty_policy_expiry, rider_insurance_start, rider_policy_expiry, status')
        .eq('id', id)
        .maybeSingle();
      existingTenant = ex;
    }

    if (updates.amc_start_date) {
      const s = String(updates.amc_start_date).split('T')[0];
      const origS = existingTenant?.amc_start_date ? String(existingTenant.amc_start_date).split('T')[0] : null;
      if (s !== origS && s < todayStr) {
        throw new Error('AMC Start Date cannot be set to a past date (no back date allowed).');
      }
    }

    const effectiveAmcStart = updates.amc_start_date !== undefined ? (updates.amc_start_date ? String(updates.amc_start_date).split('T')[0] : null) : (existingTenant?.amc_start_date ? String(existingTenant.amc_start_date).split('T')[0] : null);
    const effectiveAmcExpire = updates.amc_expire_date !== undefined ? (updates.amc_expire_date ? String(updates.amc_expire_date).split('T')[0] : null) : (existingTenant?.amc_expire_date ? String(existingTenant.amc_expire_date).split('T')[0] : null);
    if (effectiveAmcStart && effectiveAmcExpire && effectiveAmcExpire <= effectiveAmcStart) {
      throw new Error('AMC Expire Date must be strictly after AMC Start Date.');
    }

    if (updates.start_date && existingTenant?.status !== 'direct_purchase') {
      const sDate = String(updates.start_date).split('T')[0];
      const origSDate = existingTenant?.start_date ? String(existingTenant.start_date).split('T')[0] : null;
      if (sDate !== origSDate && sDate < todayStr) {
        throw new Error('Contract Start Date cannot be set to a past date (no back date allowed).');
      }
    }

    const effectiveScootyStart = updates.scooty_insurance_start !== undefined ? updates.scooty_insurance_start : existingTenant?.scooty_insurance_start;
    const effectiveScootyExpire = updates.scooty_policy_expiry !== undefined ? updates.scooty_policy_expiry : existingTenant?.scooty_policy_expiry;
    if (effectiveScootyStart && effectiveScootyExpire && effectiveScootyExpire <= effectiveScootyStart) {
      throw new Error('Scooty Policy Expiry must be strictly after Scooty Insurance Start Date.');
    }

    const effectiveRiderStart = updates.rider_insurance_start !== undefined ? updates.rider_insurance_start : existingTenant?.rider_insurance_start;
    const effectiveRiderExpire = updates.rider_policy_expiry !== undefined ? updates.rider_policy_expiry : existingTenant?.rider_policy_expiry;
    if (effectiveRiderStart && effectiveRiderExpire && effectiveRiderExpire <= effectiveRiderStart) {
      throw new Error('Rider Policy Expiry must be strictly after Rider Insurance Start Date.');
    }

    if (updates.start_date || updates.total_months) {
      const { data: existing, error: err } = await supabase.from('tenants').select('start_date, total_months').eq('id', id).single();
      if (!err && existing) {
        const startDate = new Date(updates.start_date || existing.start_date);
        const totalMonths = Number(updates.total_months || existing.total_months) || 24;
        const expectedEndDate = new Date(startDate);
        expectedEndDate.setMonth(expectedEndDate.getMonth() + totalMonths);
        updates.expected_end_date = expectedEndDate.toISOString().split('T')[0];
      }
    }

    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        console.error('[updateRental] Unique constraint violation:', error);
        throw new Error('Unique constraint violation: a record with this value already exists.');
      }
      throw error;
    }
    return data;
  }

  async cancelRental(id, req = null) {
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('status, ev_model_id, branch_id, head_office_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (req?.user) {
      const user = req.user;
      if (user.role === 'branch_admin' || user.role === 'staff') {
        if (tenant.branch_id && user.branch_id && tenant.branch_id !== user.branch_id) {
          throw new Error('Access denied: Rental belongs to another branch');
        }
      } else if (user.role === 'ho_admin') {
        if (tenant.head_office_id && user.head_office_id && tenant.head_office_id !== user.head_office_id) {
          throw new Error('Access denied: Rental belongs to another Head Office');
        }
      }
    }

    if (tenant.status === 'cancelled') throw new Error('This contract is already cancelled');
    if (tenant.status !== 'rented' && tenant.status !== 'direct_purchase' && tenant.status !== 'completed') {
      throw new Error('Only active rentals, direct purchases, or completed purchases can be cancelled');
    }

    const { error: cancelError } = await supabase
      .from('tenants')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (cancelError) throw cancelError;

    const { data: tenantDetails } = await supabase
      .from('tenants')
      .select('chassis_no, motor_no, controller_no, battery_no, charger_no, ev_model_id, branch_id, head_office_id')
      .eq('id', id)
      .single();

    if (tenantDetails) {
      await supabase
        .from('old_evs')
        .insert([{
          original_ev_model_id: tenantDetails.ev_model_id,
          returned_from_tenant_id: id,
          chassis_no: tenantDetails.chassis_no,
          motor_no: tenantDetails.motor_no,
          controller_no: tenantDetails.controller_no,
          battery_no: tenantDetails.battery_no,
          charger_no: tenantDetails.charger_no,
          branch_id: tenantDetails.branch_id,
          head_office_id: tenantDetails.head_office_id,
          price: 0,
          status: 'available'
        }]);
    }

    return { success: true };
  }

  async completeRental(id, req = null) {
    const rental = await this.getRentalById(id, req);

    if (rental.status !== 'rented') throw new Error('Rental is not currently active');

    const dpOwed = (rental.total_price - (rental.booking_amount || 0)) - (rental.downpayment_paid || 0);

    if (rental.computed_balance.outstanding > 0) {
      throw new Error(`Cannot complete: Outstanding balance is ₹${rental.computed_balance.outstanding}`);
    }

    const { data, error } = await supabase
      .from('tenants')
      .update({ status: 'completed' })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async checkUniqueHardwareOrPolicy(fields) {
    const { chassis_no, motor_no, controller_no, charger_no, battery_no, vehicle_number, scooty_policy_number, rider_policy_number } = fields;

    const orFilter = buildEqOrFilter({
      chassis_no, motor_no, controller_no, charger_no, battery_no, vehicle_number, scooty_policy_number, rider_policy_number,
    });

    if (!orFilter) {
      return { exists: false };
    }

    const { data, error } = await supabase
      .from('tenants')
      .select('chassis_no, motor_no, controller_no, charger_no, battery_no, vehicle_number, scooty_policy_number, rider_policy_number')
      .or(orFilter);

    if (error) throw error;

    if (data && data.length > 0) {
      const conflict = data[0];
      if (chassis_no && conflict.chassis_no === chassis_no) return { exists: true, message: 'Chassis number already exists in the system.' };
      if (motor_no && conflict.motor_no === motor_no) return { exists: true, message: 'Motor number already exists in the system.' };
      if (controller_no && conflict.controller_no === controller_no) return { exists: true, message: 'Controller number already exists in the system.' };
      if (charger_no && conflict.charger_no === charger_no) return { exists: true, message: 'Charger number already exists in the system.' };
      if (battery_no && conflict.battery_no === battery_no) return { exists: true, message: 'Battery serial number already exists in the system.' };
      if (vehicle_number && conflict.vehicle_number === vehicle_number) return { exists: true, message: 'Vehicle number already exists in the system.' };
      if (scooty_policy_number && conflict.scooty_policy_number === scooty_policy_number) return { exists: true, message: 'Scooty policy number already exists in the system.' };
      if (rider_policy_number && conflict.rider_policy_number === rider_policy_number) return { exists: true, message: 'Rider policy number already exists in the system.' };

      return { exists: true, message: 'One of the provided unique identifiers already exists in the system.' };
    }

    return { exists: false };
  }
}

module.exports = new RentalsService();
