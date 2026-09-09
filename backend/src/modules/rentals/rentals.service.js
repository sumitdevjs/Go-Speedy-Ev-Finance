const supabase = require('../../config/db');
const { calcBalance } = require('../../utils/balanceCalc');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
const { buildSearchFilter } = require('../../utils/searchFilter');

class RentalsService {
  async getRentals(query = {}) {
    const { page, limit, offset } = getPaginationOptions(query);
    
    let queryBuilder = supabase
      .from('tenants')
      .select('*, ev_models(name, company, total_price), users!tenants_created_by_fkey(name)', { count: 'exact' });

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

    const { data: tenants, count, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

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

    // Prevent new rental if an active one exists for this phone
    if (tenantData.phone) {
      const { data: existingActive } = await supabase
        .from('tenants')
        .select('id')
        .eq('phone', tenantData.phone)
        .eq('status', 'rented')
        .limit(1)
        .maybeSingle();

      if (existingActive) {
        throw new Error('This person already has an active rental contract. Cannot create a new one.');
      }
    }

    // 1. Fetch Model to get price and check stock
    const { data: model, error: modelError } = await supabase
      .from('ev_models')
      .select('total_price, stock_count')
      .eq('id', tenantData.ev_model_id)
      .single();
      
    if (modelError || !model) throw new Error('EV Model not found');
    if (model.stock_count <= 0) throw new Error('EV Model out of stock');

    // 2. Decrement stock
    const { error: stockError } = await supabase
      .from('ev_models')
      .update({ stock_count: model.stock_count - 1 })
      .eq('id', tenantData.ev_model_id)
      .gt('stock_count', 0); // Safety net for concurrent access

    if (stockError) throw new Error('Failed to reserve stock. It might be exhausted.');

    // 3. Compute dates
    const startDate = tenantData.start_date ? new Date(tenantData.start_date) : new Date();
    const totalMonths = tenantData.total_months || 24;
    const expectedEndDate = new Date(startDate);
    expectedEndDate.setMonth(expectedEndDate.getMonth() + totalMonths);

    // 4. Insert Tenant
    try {
      const { data, error } = await supabase
        .from('tenants')
        .insert([{
          ...tenantData,
          total_price: model.total_price, // snapshot price
          start_date: tenantData.status === 'direct_purchase' ? null : startDate.toISOString().split('T')[0],
          expected_end_date: tenantData.status === 'direct_purchase' ? null : expectedEndDate.toISOString().split('T')[0],
          created_by: createdBy
        }])
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      // Rollback stock
      await supabase
        .from('ev_models')
        .update({ stock_count: model.stock_count })
        .eq('id', tenantData.ev_model_id);
      
      if (error.code === '23505') throw new Error(`Unique constraint violation: ${error.details || error.message}`);
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
        const totalMonths = updates.total_months || existing.total_months;
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
      if (error.code === '23505') throw new Error(`Unique constraint violation: ${error.details || error.message}`);
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
    if (tenant.status === 'cancelled') throw new Error('Rental is already cancelled');
    if (tenant.status !== 'rented') throw new Error('Only active rentals can be cancelled');

    // 1. Update status
    const { error: cancelError } = await supabase
      .from('tenants')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (cancelError) throw cancelError;

    // 2. Restore stock
    const { data: model } = await supabase
      .from('ev_models')
      .select('stock_count')
      .eq('id', tenant.ev_model_id)
      .single();

    if (model) {
      await supabase
        .from('ev_models')
        .update({ stock_count: model.stock_count + 1 })
        .eq('id', tenant.ev_model_id);
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
}

module.exports = new RentalsService();
