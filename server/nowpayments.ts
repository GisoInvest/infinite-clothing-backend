import NOWPayments from "@nowpaymentsio/nowpayments-api-js";

const nowPaymentsClient = new NOWPayments({
  apiKey: process.env.NOWPAYMENTS_API_KEY!,
});

export interface CreateCryptoPaymentParams {
  priceAmount: number; // Amount in GBP
  priceCurrency: string; // "GBP"
  payCurrency?: string; // Optional: specific crypto (e.g., "BTC", "ETH")
  orderNumber: string;
  orderDescription: string;
  ipnCallbackUrl: string;
}

export interface CryptoPayment {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  payment_url: string;
}

/**
 * Create a crypto payment with NOWPayments
 */
export async function createCryptoPayment(
  params: CreateCryptoPaymentParams
): Promise<CryptoPayment> {
  try {
    const payment = await nowPaymentsClient.createPayment({
      price_amount: params.priceAmount,
      price_currency: params.priceCurrency,
      pay_currency: params.payCurrency, // If not specified, customer can choose
      order_id: params.orderNumber,
      order_description: params.orderDescription,
      ipn_callback_url: params.ipnCallbackUrl,
    });

    return payment as CryptoPayment;
  } catch (error) {
    console.error("NOWPayments error:", error);
    throw new Error("Failed to create crypto payment");
  }
}

/**
 * Get payment status from NOWPayments
 */
export async function getPaymentStatus(paymentId: string) {
  try {
    const status = await nowPaymentsClient.getPaymentStatus({ id: paymentId });
    return status;
  } catch (error) {
    console.error("NOWPayments get status error:", error);
    throw new Error("Failed to get payment status");
  }
}

/**
 * Get list of available cryptocurrencies
 */
export async function getAvailableCurrencies() {
  try {
    const currencies = await nowPaymentsClient.getCurrencies();
    return currencies;
  } catch (error) {
    console.error("NOWPayments get currencies error:", error);
    throw new Error("Failed to get available currencies");
  }
}

/**
 * Get minimum payment amount for a currency
 */
export async function getMinimumPaymentAmount(currency: string) {
  try {
    const minAmount = await nowPaymentsClient.getMinimumPaymentAmount({
      currency_from: "GBP",
      currency_to: currency,
    });
    return minAmount;
  } catch (error) {
    console.error("NOWPayments get min amount error:", error);
    throw new Error("Failed to get minimum payment amount");
  }
}
