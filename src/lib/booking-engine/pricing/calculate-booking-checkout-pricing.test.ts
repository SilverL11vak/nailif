import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBookingCheckoutPricingFromBookingRecord,
  calculateBookingCheckoutPricingFromStore,
} from './calculate-booking-checkout-pricing';

test('service only keeps pay-now as booking fee', () => {
  const totals = calculateBookingCheckoutPricingFromStore({
    baseServicePrice: 25,
    serviceTotal: 25,
    depositAmount: 10,
    productsTotal: 0,
  });

  assert.equal(totals.bookingFee, 10);
  assert.equal(totals.payNowTotal, 10);
  assert.equal(totals.productsTotal, 0);
  assert.equal(totals.payLaterTotal, 15);
});

test('service plus one product charges booking fee plus products now', () => {
  const totals = calculateBookingCheckoutPricingFromStore({
    baseServicePrice: 25,
    serviceTotal: 25,
    depositAmount: 10,
    products: [{ unitPrice: 49, quantity: 1 }],
  });

  assert.equal(totals.productsTotal, 49);
  assert.equal(totals.payNowTotal, 59);
  assert.equal(totals.payLaterTotal, 15);
});

test('service plus extras updates salon remaining while pay-now stays booking fee without products', () => {
  const totals = calculateBookingCheckoutPricingFromStore({
    baseServicePrice: 25,
    serviceTotal: 33,
    depositAmount: 10,
    products: [],
  });

  assert.equal(totals.serviceTotal, 33);
  assert.equal(totals.payNowTotal, 10);
  assert.equal(totals.payLaterTotal, 23);
});

test('service plus extras plus products uses booking fee plus products now', () => {
  const totals = calculateBookingCheckoutPricingFromStore({
    baseServicePrice: 25,
    serviceTotal: 33,
    depositAmount: 10,
    products: [{ unitPrice: 49, quantity: 1 }],
  });

  assert.equal(totals.serviceTotal, 33);
  assert.equal(totals.productsTotal, 49);
  assert.equal(totals.payNowTotal, 59);
  assert.equal(totals.payLaterTotal, 23);
});

test('product quantities greater than one are included in pay now total', () => {
  const totals = calculateBookingCheckoutPricingFromBookingRecord({
    servicePrice: 25,
    totalPrice: 25,
    depositAmount: 10,
    productsTotalPrice: 98,
  });

  assert.equal(totals.productsTotal, 98);
  assert.equal(totals.payNowTotal, 108);
  assert.equal(totals.payLaterTotal, 15);
});
