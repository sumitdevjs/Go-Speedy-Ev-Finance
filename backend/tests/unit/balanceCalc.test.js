const { calcBalance } = require('../../src/utils/balanceCalc');

describe('Financial Balance Calculation', () => {
  test('booking amount deducted before downpayment', () => {
    const tenant = {
      total_price: 500,
      booking_amount: 50,
      downpayment_paid: 100,
      installment_daily_rate: 250,
    };
    const result = calcBalance(tenant, 0);
    expect(result.contractAmount).toBe(450);
    expect(result.installmentTotal).toBe(350);
    expect(result.outstanding).toBe(350);
    expect(result.daysOverdue).toBe(2);
    expect(result.daysAdvance).toBe(0);
  });

  test('auto-complete when outstanding reaches 0', () => {
    const tenant = {
      total_price: 500,
      booking_amount: 50,
      downpayment_paid: 100,
      installment_daily_rate: 250,
    };
    const result = calcBalance(tenant, 350);
    expect(result.outstanding).toBe(0);
    expect(result.daysOverdue).toBe(0);
  });

  test('overpayment shows advance days not negative outstanding', () => {
    const tenant = {
      total_price: 500,
      booking_amount: 50,
      downpayment_paid: 100,
      installment_daily_rate: 250,
    };
    const result = calcBalance(tenant, 600);
    expect(result.outstanding).toBe(0);
    expect(result.daysAdvance).toBe(1); // 250 overpaid -> 1 day advance
  });

  test('handles 0 booking and 0 downpayment gracefully', () => {
    const tenant = {
      total_price: 80000,
      installment_daily_rate: 250,
    };
    const result = calcBalance(tenant, 1000);
    expect(result.contractAmount).toBe(80000);
    expect(result.installmentTotal).toBe(80000);
    expect(result.outstanding).toBe(79000);
    expect(result.daysOverdue).toBe(Math.ceil(79000 / 250));
  });

  test('detects 24-month breach flagged when past expected_end_date', () => {
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 2);

    const tenant = {
      total_price: 50000,
      downpayment_paid: 5000,
      installment_daily_rate: 250,
      expected_end_date: pastDate.toISOString().split('T')[0],
    };

    const result = calcBalance(tenant, 10000);
    expect(result.contractExpired).toBe(true);
  });
});
