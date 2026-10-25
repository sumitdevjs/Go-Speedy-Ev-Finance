const supabase = require('../../config/db');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
const { buildSearchFilter } = require('../../utils/searchFilter');
const { applyScope, resolveCreateScope } = require('../../middleware/scope');

class BookingsService {
  async getBookings(query = {}, req = null) {
    const { page, limit, offset } = getPaginationOptions(query);

    let queryBuilder = supabase
      .from('bookings')
      .select('*, ev_models(name, company, kilometres), users!bookings_created_by_fkey(name)', { count: 'exact' });

    if (query.status && query.status !== 'all') {
      queryBuilder = queryBuilder.eq('status', query.status);
    } else if (!query.status) {
      queryBuilder = queryBuilder.eq('status', 'pending');
    }

    if (req) {
      queryBuilder = applyScope(queryBuilder, req);
    }

    if (query.search) {
      queryBuilder = queryBuilder.or(buildSearchFilter(['name', 'phone'], query.search));
    }

    const { data, count, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    if (data && data.some(b => b.branch_id)) {
      try {
        const branchIds = [...new Set(data.map(b => b.branch_id).filter(Boolean))];
        if (branchIds.length > 0) {
          const { data: bList } = await supabase.from('branches').select('id, name, code').in('id', branchIds);
          const bMap = new Map((bList || []).map(b => [b.id, b]));
          data.forEach(b => { if (b.branch_id) b.branch = bMap.get(b.branch_id) || null; });
        }
      } catch (e) { }
    }

    const meta = getPaginationMeta(count, page, limit);
    return { data, meta };
  }

  async createBooking(bookingData, createdBy, req = null) {
    let assignedBranchId = bookingData.branch_id || null;
    let assignedHoId = bookingData.head_office_id || null;

    if (req) {
      const scope = resolveCreateScope(req, bookingData);
      assignedBranchId = scope.branch_id;
      assignedHoId = scope.head_office_id;
    }

    const insertPayload = {
      ...bookingData,
      created_by: createdBy
    };
    if (assignedBranchId) insertPayload.branch_id = assignedBranchId;
    if (assignedHoId) insertPayload.head_office_id = assignedHoId;

    const { data, error } = await supabase
      .from('bookings')
      .insert([insertPayload])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async convertBooking(id, tenantData, createdBy, req = null) {
    // Sanitize empty strings to undefined so they are not inserted as "" into numeric/date DB columns
    Object.keys(tenantData).forEach(key => {
      if (tenantData[key] === '') {
        delete tenantData[key];
      }
    });

    // Remove fields not in DB schema to prevent PostgREST errors
    delete tenantData.include_gst;
    delete tenantData.gst_percent;

    // 1. Fetch Booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (bookingError) throw bookingError;
    if (booking.status !== 'pending') throw new Error(`Booking status is ${booking.status}`);

    if (req?.user) {
      this.authorizeBooking(booking, req);
    }

    // If tenantData doesn't have ev_model_id, use booking's
    if (!tenantData.ev_model_id && booking.ev_model_id) {
      tenantData.ev_model_id = booking.ev_model_id;
    }

    if (!tenantData.ev_model_id) {
      throw new Error('ev_model_id is required to convert a booking into a rental');
    }

    const startDate = tenantData.start_date ? new Date(tenantData.start_date) : new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (Number(tenantData.total_months) || 24));
    if (tenantData.status !== 'direct_purchase' && startDate.toISOString().split('T')[0] < new Date().toISOString().split('T')[0]) {
      throw new Error('Contract Start Date cannot be in the past');
    }
    const { data, error } = await supabase.rpc('create_contract', {
      p_actor: createdBy, p_booking: id,
      p_tenant: {
        ...tenantData, name: tenantData.name || booking.name, phone: tenantData.phone || booking.phone,
        start_date: tenantData.status === 'direct_purchase' ? null : startDate.toISOString().split('T')[0],
        expected_end_date: tenantData.status === 'direct_purchase' ? null : endDate.toISOString().split('T')[0],
      },
    });
    if (error?.code === '23505') throw new Error('Unique constraint violation: an active contract already uses this phone or hardware.');
    if (error) throw error;
    return data;
  }

  authorizeBooking(booking, req) {
    if (!req?.user || !booking) return;
    const user = req.user;
    const isSuper = user.role === 'super_admin' || (user.role === 'admin' && !user.ward_area);
    if (isSuper) return;

    if (user.role === 'branch_admin' || user.role === 'staff') {
      if (!user.branch_id || !booking.branch_id || booking.branch_id !== user.branch_id) {
        throw new Error('Access denied: Booking belongs to another branch');
      }
    } else if (user.role === 'ho_admin') {
      if (!user.head_office_id || !booking.head_office_id || booking.head_office_id !== user.head_office_id) {
        throw new Error('Access denied: Booking belongs to another Head Office');
      }
    }
  }

  async cancelBooking(id, req = null) {
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, branch_id, head_office_id, status')
      .eq('id', id)
      .single();

    if (fetchErr || !booking) throw new Error('Booking not found');
    this.authorizeBooking(booking, req);
    if (booking.status !== 'pending') throw new Error('Booking is not pending');

    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('status', 'pending')
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new Error('Booking not found or not pending');
      throw error;
    }
    return data;
  }

  async updateBooking(id, updates, req = null) {
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, branch_id, head_office_id, status')
      .eq('id', id)
      .single();

    if (fetchErr || !booking) throw new Error('Booking not found');
    this.authorizeBooking(booking, req);

    if (updates.status !== undefined && updates.status !== booking.status) {
      throw new Error('Booking status cannot be updated directly. Use convert or cancel endpoints.');
    }
    if (updates.branch_id !== undefined && updates.branch_id !== booking.branch_id) {
      throw new Error('Cannot change booking branch assignment');
    }
    if (updates.head_office_id !== undefined && updates.head_office_id !== booking.head_office_id) {
      throw new Error('Cannot change booking Head Office assignment');
    }

    const allowedFields = ['name', 'phone', 'ev_model_id', 'model_name_raw', 'booking_amount', 'notes'];
    const safeUpdates = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        safeUpdates[key] = updates[key];
      }
    }
    if (Object.keys(safeUpdates).length === 0) {
      return booking;
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(safeUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new Error('Booking not found');
      throw error;
    }
    return data;
  }
}

module.exports = new BookingsService();
