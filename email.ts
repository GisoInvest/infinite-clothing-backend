import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY is not set - email functionality will be disabled');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@infiniteclothingstore.co.uk';

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export async function sendOrderConfirmationEmail(data: OrderEmailData) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('Email not sent - SENDGRID_API_KEY not configured');
    return { success: false, message: 'Email service not configured' };
  }

  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #1A1F2E;">${item.productName}</td>
      <td style="padding: 10px; border-bottom: 1px solid #1A1F2E; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #1A1F2E; text-align: right;">£${(item.price / 100).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #1A1F2E; text-align: right;">£${((item.price * item.quantity) / 100).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const addressHtml = `
    ${data.shippingAddress.line1}<br>
    ${data.shippingAddress.line2 ? `${data.shippingAddress.line2}<br>` : ''}
    ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}<br>
    ${data.shippingAddress.country}
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - INF!NITE C107HING</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #0A0E1A; color: #FFFFFF;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #00E5FF;">
      <h1 style="color: #00E5FF; font-size: 32px; margin: 0; text-shadow: 0 0 10px rgba(0, 229, 255, 0.8);">
        INF!NITE C107HING
      </h1>
    </div>

    <!-- Content -->
    <div style="padding: 30px 0;">
      <h2 style="color: #00E5FF; font-size: 24px;">Order Confirmation</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #CCCCCC;">
        Hi ${data.customerName},
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #CCCCCC;">
        Thank you for your order! We're excited to get your new INF!NITE C107HING pieces to you.
      </p>

      <!-- Order Details -->
      <div style="background-color: #1A1F2E; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #00E5FF;">
        <h3 style="color: #00E5FF; margin-top: 0;">Order #${data.orderNumber}</h3>
        
        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="border-bottom: 2px solid #00E5FF;">
              <th style="padding: 10px; text-align: left; color: #00E5FF;">Product</th>
              <th style="padding: 10px; text-align: center; color: #00E5FF;">Qty</th>
              <th style="padding: 10px; text-align: right; color: #00E5FF;">Price</th>
              <th style="padding: 10px; text-align: right; color: #00E5FF;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #00E5FF;">
          <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>Subtotal:</span>
            <span>£${(data.subtotal / 100).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>Shipping:</span>
            <span>£${(data.shipping / 100).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>Tax:</span>
            <span>£${(data.tax / 100).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 20px; font-weight: bold; color: #00E5FF; border-top: 1px solid #00E5FF; margin-top: 10px;">
            <span>Total:</span>
            <span>£${(data.total / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Shipping Address -->
      <div style="background-color: #1A1F2E; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #00E5FF; margin-top: 0;">Shipping Address</h3>
        <p style="line-height: 1.8; color: #CCCCCC;">
          ${addressHtml}
        </p>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #CCCCCC;">
        We'll send you another email with tracking information once your order ships.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: #CCCCCC;">
        If you have any questions, feel free to reply to this email.
      </p>

      <p style="font-size: 16px; line-height: 1.6; color: #00E5FF; margin-top: 30px;">
        Wear what moves you,<br>
        <strong>The INF!NITE C107HING Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px 0; border-top: 1px solid #1A1F2E; color: #666666; font-size: 12px;">
      <p>© ${new Date().getFullYear()} INF!NITE C107HING. All rights reserved.</p>
      <p>infiniteclothingstore.co.uk</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await sgMail.send({
      to: data.customerEmail,
      from: FROM_EMAIL,
      subject: `Order Confirmation - #${data.orderNumber}`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

export async function sendAdminOrderNotification(data: OrderEmailData) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('Email not sent - SENDGRID_API_KEY not configured');
    return { success: false, message: 'Email service not configured' };
  }

  const itemsList = data.items
    .map((item) => `- ${item.productName} x${item.quantity} - £${((item.price * item.quantity) / 100).toFixed(2)}`)
    .join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Order - ${data.orderNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #0A0E1A; color: #FFFFFF; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1A1F2E; padding: 30px; border-radius: 8px; border: 1px solid #00E5FF;">
    <h1 style="color: #00E5FF;">New Order Received!</h1>
    <h2>Order #${data.orderNumber}</h2>
    
    <h3 style="color: #00E5FF;">Customer Information:</h3>
    <p>
      <strong>Name:</strong> ${data.customerName}<br>
      <strong>Email:</strong> ${data.customerEmail}
    </p>

    <h3 style="color: #00E5FF;">Order Items:</h3>
    <pre style="background-color: #0A0E1A; padding: 15px; border-radius: 4px;">${itemsList}</pre>

    <h3 style="color: #00E5FF;">Order Total: £${(data.total / 100).toFixed(2)}</h3>

    <h3 style="color: #00E5FF;">Shipping Address:</h3>
    <p>
      ${data.shippingAddress.line1}<br>
      ${data.shippingAddress.line2 ? `${data.shippingAddress.line2}<br>` : ''}
      ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}<br>
      ${data.shippingAddress.country}
    </p>

    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #00E5FF;">
      <a href="https://infiniteclothingstore.co.uk/admin/orders" style="color: #00E5FF;">View in Admin Dashboard</a>
    </p>
  </div>
</body>
</html>
  `;

  try {
    await sgMail.send({
      to: FROM_EMAIL, // Send to business email
      from: FROM_EMAIL,
      subject: `New Order #${data.orderNumber} - £${(data.total / 100).toFixed(2)}`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    return { success: false, error };
  }
}

