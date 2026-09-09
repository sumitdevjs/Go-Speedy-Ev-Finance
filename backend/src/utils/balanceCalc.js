/**
 * Financial calculation logic for tenant balances
 */
function calcBalance(tenant, totalPaid = 0) {
  // EV sticker price snapshot minus the booking amount
  const bookingAmount = tenant.booking_amount ? Number(tenant.booking_amount) : 0;
  const totalPrice = tenant.total_price ? Number(tenant.total_price) : 0;
  
  const contractAmount = totalPrice - bookingAmount;
  
  // What is paid off in installments
  const downpaymentPaid = tenant.downpayment_paid ? Number(tenant.downpayment_paid) : 0;
  const installmentTotal = contractAmount - downpaymentPaid;
  
  // Calculate outstanding and overpaid
  const outstanding = Math.max(0, installmentTotal - totalPaid);
  const overpaid = Math.max(0, totalPaid - installmentTotal);
  
  const dailyRate = tenant.installment_daily_rate ? Number(tenant.installment_daily_rate) : 250;
  const frequency = tenant.installment_frequency || 'daily';
  
  // Calculate how much should have been collected by today
  const startDate = tenant.start_date ? new Date(tenant.start_date) : new Date(tenant.created_at);
  startDate.setHours(0, 0, 0, 0); // Start of day
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of day today

  // Calculate full days elapsed since start date
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysElapsed = Math.max(0, Math.floor((today - startDate) / msPerDay));

  let expectedCollection = 0;
  if (frequency === 'daily') {
    expectedCollection = daysElapsed * dailyRate;
  } else if (frequency === 'weekly') {
    const weeksElapsed = Math.floor(daysElapsed / 7);
    expectedCollection = weeksElapsed * (dailyRate * 7);
  } else if (frequency === 'monthly') {
    // Approx 30 days for financial calculation
    const monthsElapsed = Math.floor(daysElapsed / 30);
    expectedCollection = monthsElapsed * (dailyRate * 30);
  }

  // Cap expected collection at the max possible remaining
  expectedCollection = Math.min(expectedCollection, installmentTotal);

  const shortfall = expectedCollection - totalPaid;
  
  let daysOverdue = 0;
  let daysAdvance = 0;
  
  if (shortfall > 0) {
    daysOverdue = Math.ceil(shortfall / dailyRate);
  } else if (shortfall < 0) {
    daysAdvance = Math.floor(Math.abs(shortfall) / dailyRate);
  }

  let contractExpired = false;
  if (tenant.expected_end_date) {
    const endDate = new Date(tenant.expected_end_date);
    endDate.setHours(0, 0, 0, 0);
    contractExpired = endDate < today && outstanding > 0;
  }

  if (tenant.status === 'cancelled') {
    return {
      contractAmount,
      installmentTotal,
      outstanding,
      daysOverdue: 0,
      daysAdvance: 0,
      contractExpired: false,
    };
  }

  return {
    contractAmount,
    installmentTotal,
    outstanding,
    daysOverdue,
    daysAdvance,
    contractExpired,
  };
}

module.exports = {
  calcBalance,
};
