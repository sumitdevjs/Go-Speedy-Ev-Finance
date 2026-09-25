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
      .select('*, ev_models(name, company, total_price), users!tenants_created_by_fkey(name)', { count: 'exact' });

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

    // Insurance status filter
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

    // Safely batch-resolve branch details if branch_id exists on rows
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

    // Fetch total paid for all these tenants to compute balance
    const tenantIds = tenants.map(t => t.id);
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('tenant_id, amount')
      .in('tenant_id', tenantIds);

    if (paymentsError) throw paymentsError;

    // Group payments by tenant
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

    // Optionally filter by overdue_days if requested (done in-memory for now)
    let finalData = enrichedData;
    if (query.overdue_days) {
      const minOverdue = parseInt(query.overdue_days);
      finalData = finalData.filter(t => t.computed_balance.daysOverdue >= minOverdue);
    }

    const meta = getPaginationMeta(count, page, limit);
    return { data: finalData, meta };
  }

  async getRentalById(id) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*, ev_models(name, company)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!tenant) throw new Error('Rental not found');

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('tenant_id', id);

    if (paymentsError) throw paymentsError;

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = calcBalance(tenant, totalPaid);

    return { ...tenant, computed_balance: balance, total_paid: totalPaid };
  }

  async createRental(tenantData, createdBy) {
    // Sanitize empty strings to undefined so they are inserted as NULL in DB
    Object.keys(tenantData).forEach(key => {
      if (tenantData[key] === '') {
        delete tenantData[key];
      }
    });

    // Remove fields not in DB schema to prevent PostgREST errors
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

    // Prevent new rental if an active one exists for this phone
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

      // Mark old EV as rented or sold
      await supabase
        .from('old_evs')
        .update({ status: tenantData.status === 'direct_purchase' ? 'sold' : 'rented' })
        .eq('id', tenantData.old_ev_id);
    } else {
      // 1. Fetch Model to get price and check stock
      const { data: model, error: modelError } = await supabase
        .from('ev_models')
        .select('total_price, stock_count')
        .eq('id', tenantData.ev_model_id)
        .single();

      if (modelError || !model) throw new Error('EV Model not found');
      if (model.stock_count <= 0) throw new Error('EV Model out of stock');

      originalStockCount = model.stock_count;

      // 2. Decrement stock
      const { error: stockError } = await supabase
        .from('ev_models')
        .update({ stock_count: model.stock_count - 1 })
        .eq('id', tenantData.ev_model_id)
        .gt('stock_count', 0);

      if (stockError) throw new Error('Failed to reserve stock. It might be exhausted.');
      modelTotalPrice = model.total_price;
    }

    // 3. Compute dates
    const startDate = tenantData.start_date ? new Date(tenantData.start_date) : new Date();
    const totalMonths = Number(tenantData.total_months) || 24;
    const expectedEndDate = new Date(startDate);
    expectedEndDate.setMonth(expectedEndDate.getMonth() + totalMonths);

    // Ensure NOT NULL fields are never null for direct_purchase
    if (tenantData.status === 'direct_purchase') {
      tenantData.installment_daily_rate = 0;
      tenantData.installment_frequency = tenantData.installment_frequency || 'daily';
      tenantData.downpayment_paid = tenantData.downpayment_paid ?? 0;
      tenantData.booking_amount = tenantData.booking_amount ?? 0;
    } else {
      tenantData.installment_daily_rate = tenantData.installment_daily_rate ?? 0;
      tenantData.installment_frequency = tenantData.installment_frequency || 'daily';
    }

    // 4. Insert Tenant
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
      // Rollback stock or old_ev reservation
      if (!isOldEv && tenantData.ev_model_id) {
        await supabase
          .from('ev_models')
          .update({ stock_count: originalStockCount })
          .eq('id', tenantData.ev_model_id);
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

  async updateRental(id, updates) {
    // Sanitize empty strings to undefined so they are updated as NULL in DB
    Object.keys(updates).forEach(key => {
      if (updates[key] === '') {
        updates[key] = null; // Use null for update to explicitly clear it
      }
    });

    // Handle expected_end_date recalculation if start_date changes
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

  async cancelRental(id) {
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('status, ev_model_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (tenant.status === 'cancelled') throw new Error('This contract is already cancelled');
    if (tenant.status !== 'rented' && tenant.status !== 'direct_purchase' && tenant.status !== 'completed') {
      throw new Error('Only active rentals, direct purchases, or completed purchases can be cancelled');
    }

    // 1. Update status
    const { error: cancelError } = await supabase
      .from('tenants')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (cancelError) throw cancelError;

    // 2. Insert into old_evs instead of restoring stock to ev_models
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
          price: 0, // Admin can update this later
          status: 'available'
        }]);
    }

    return { success: true };
  }

  async completeRental(id) {
    // Verify it can be completed (outstanding = 0, dp cleared)
    const rental = await this.getRentalById(id);

    if (rental.status !== 'rented') throw new Error('Rental is not currently active');

    const dpOwed = (rental.total_price - (rental.booking_amount || 0)) - (rental.downpayment_paid || 0);
    // Actually the calculation logic in balanceCalc handles downpayment properly via contractAmount

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

    // buildEqOrFilter escapes values so a comma/parenthesis can't inject
    // extra filter clauses into the query.
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
      // Find which one matched to give a specific error message
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
