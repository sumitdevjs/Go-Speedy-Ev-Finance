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
  
  // Overdue and advance days
  const daysOverdue = Math.ceil(outstanding / dailyRate);
  const daysAdvance = Math.floor(overpaid / dailyRate);
  
  let contractExpired = false;
  if (tenant.expected_end_date) {
    contractExpired = new Date(tenant.expected_end_date) < new Date();
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
