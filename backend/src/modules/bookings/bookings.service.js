const supabase = require('../../config/db');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
const { buildSearchFilter } = require('../../utils/searchFilter');

class BookingsService {
  async getBookings(query = {}) {
    const { page, limit, offset } = getPaginationOptions(query);

    let queryBuilder = supabase
      .from('bookings')
      .select('*, ev_models(name, company), users!bookings_created_by_fkey(name)', { count: 'exact' })
      .eq('status', 'pending');

    if (query.search) {
      queryBuilder = queryBuilder.or(buildSearchFilter(['name', 'phone'], query.search));
    }

    const { data, count, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const meta = getPaginationMeta(count, page, limit);
    return { data, meta };
  }

  async createBooking(bookingData, createdBy) {
    const { data, error } = await supabase
      .from('bookings')
      .insert([{
        ...bookingData,
        created_by: createdBy
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async convertBooking(id, tenantData, createdBy) {
    // 1. Fetch Booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (bookingError) throw bookingError;
    if (booking.status !== 'pending') throw new Error(`Booking status is ${booking.status}`);

    // If tenantData doesn't have ev_model_id, use booking's
    if (!tenantData.ev_model_id && booking.ev_model_id) {
      tenantData.ev_model_id = booking.ev_model_id;
    }

    if (!tenantData.ev_model_id) {
      throw new Error('ev_model_id is required to convert a booking into a rental');
    }

    // 2. Fetch Model & Stock Check
    const { data: model, error: modelError } = await supabase
      .from('ev_models')
      .select('total_price, stock_count')
      .eq('id', tenantData.ev_model_id)
      .single();

    if (modelError || !model) throw new Error('EV Model not found');
    if (model.stock_count <= 0) throw new Error('EV Model out of stock');

    // 3. Decrement Stock
    const { error: stockError } = await supabase
      .from('ev_models')
      .update({ stock_count: model.stock_count - 1 })
      .eq('id', tenantData.ev_model_id)
      .gt('stock_count', 0);

    if (stockError) throw new Error('Failed to reserve stock.');

    try {
      // 4. Create Rental
      const startDate = tenantData.start_date ? new Date(tenantData.start_date) : new Date();
      const totalMonths = tenantData.total_months || 24;
      const expectedEndDate = new Date(startDate);
      expectedEndDate.setMonth(expectedEndDate.getMonth() + totalMonths);

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert([{
          ...tenantData,
          total_price: model.total_price,
          booking_amount: booking.booking_amount,
          name: tenantData.name || booking.name,
          phone: tenantData.phone || booking.phone,
          start_date: startDate.toISOString().split('T')[0],
          expected_end_date: expectedEndDate.toISOString().split('T')[0],
          created_by: createdBy
        }])
        .select('*')
        .single();

      if (tenantError) throw tenantError;

      // 5. Update Booking Status
      await supabase
        .from('bookings')
        .update({ status: 'converted', converted_to: tenant.id })
        .eq('id', id);

      return tenant;
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

  async cancelBooking(id) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('status', 'pending')
      .select('*')
      .single();

    if (error) {
       // Check if no rows were updated (meaning it wasn't pending)
       if(error.code === 'PGRST116') throw new Error('Booking not found or not pending');
       throw error;
    }
    return data;
  }

  async updateBooking(id, updates) {
    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
       if(error.code === 'PGRST116') throw new Error('Booking not found');
       throw error;
    }
    return data;
  }
}

module.exports = new BookingsService();
