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


export interface OrderStatusEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
  estimatedDelivery?: string;
}

export async function sendOrderStatusEmail(data: OrderStatusEmailData) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('Email not sent - SENDGRID_API_KEY not configured');
    return { success: false, message: 'Email service not configured' };
  }

  const statusMessages: Record<string, { subject: string; message: string; icon: string }> = {
    processing: {
      subject: 'Your Order is Being Processed',
      message: 'We\'ve received your order and are preparing it for production. We\'ll notify you once it\'s on its way!',
      icon: '⚙️',
    },
    in_production: {
      subject: 'Your Order is In Production',
      message: 'Great news! Your custom items are being produced by our fulfillment partner. This usually takes 2-5 business days.',
      icon: '🏭',
    },
    shipped: {
      subject: 'Your Order Has Shipped!',
      message: 'Your order is on its way! You can track your package using the information below.',
      icon: '📦',
    },
    delivered: {
      subject: 'Your Order Has Been Delivered',
      message: 'Your order has been delivered! We hope you love your new INF!NITE C107HING gear. How does it look?',
      icon: '✅',
    },
    cancelled: {
      subject: 'Your Order Has Been Cancelled',
      message: 'Your order has been cancelled as requested. If you have any questions, please don\'t hesitate to reach out.',
      icon: '❌',
    },
  };

  const statusInfo = statusMessages[data.status] || {
    subject: 'Order Status Update',
    message: `Your order status has been updated to: ${data.status}`,
    icon: '📋',
  };

  const trackingHtml = data.trackingNumber
    ? `
    <div style="background: #1A1F2E; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #00D9FF; margin: 0 0 10px 0;">Tracking Information</h3>
      <p style="color: #E0E0E0; margin: 5px 0;"><strong>Carrier:</strong> ${data.shippingCarrier || 'N/A'}</p>
      <p style="color: #E0E0E0; margin: 5px 0;"><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
      ${data.estimatedDelivery ? `<p style="color: #E0E0E0; margin: 5px 0;"><strong>Estimated Delivery:</strong> ${new Date(data.estimatedDelivery).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
    </div>
  `
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0A0E1A;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1A1F2E 0%, #0A0E1A 100%); border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0, 217, 255, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #00D9FF; margin: 0; font-size: 32px; text-transform: uppercase; letter-spacing: 2px;">INF!NITE C107HING</h1>
            <p style="color: #888; margin: 10px 0 0 0; font-size: 14px;">WEAR WHAT MOVES YOU</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 48px; margin-bottom: 20px;">${statusInfo.icon}</div>
            <h2 style="color: #FFFFFF; margin: 0 0 10px 0;">${statusInfo.subject}</h2>
            <p style="color: #B0B0B0; font-size: 16px; line-height: 1.6;">${statusInfo.message}</p>
          </div>

          <div style="background: #1A1F2E; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #E0E0E0; margin: 5px 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p style="color: #E0E0E0; margin: 5px 0;"><strong>Status:</strong> <span style="color: #00D9FF; text-transform: uppercase;">${data.status.replace('_', ' ')}</span></p>
          </div>

          ${trackingHtml}

          ${data.status === 'delivered' ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://infiniteclothingstore.co.uk" style="display: inline-block; background: linear-gradient(135deg, #00D9FF 0%, #0099CC 100%); color: #0A0E1A; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Leave a Review</a>
          </div>
          ` : ''}

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #1A1F2E;">
            <p style="color: #666; font-size: 14px; margin: 5px 0;">Questions? Contact us at support@infiniteclothingstore.co.uk</p>
            <p style="color: #666; font-size: 12px; margin: 15px 0 0 0;">© 2024 INF!NITE C107HING. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const msg = {
    to: data.customerEmail,
    from: FROM_EMAIL,
    subject: `${statusInfo.subject} - Order #${data.orderNumber}`,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Order status email sent to ${data.customerEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending order status email:', error);
    throw error;
  }
}

export interface OrderCancellationEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
}

export async function sendOrderCancellationEmail(data: OrderCancellationEmailData) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('Email not sent - SENDGRID_API_KEY not configured');
    return { success: false, message: 'Email service not configured' };
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0A0E1A;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1A1F2E 0%, #0A0E1A 100%); border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0, 217, 255, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #00D9FF; margin: 0; font-size: 32px; text-transform: uppercase; letter-spacing: 2px;">INF!NITE C107HING</h1>
            <p style="color: #888; margin: 10px 0 0 0; font-size: 14px;">WEAR WHAT MOVES YOU</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 48px; margin-bottom: 20px;">✓</div>
            <h2 style="color: #FFFFFF; margin: 0 0 10px 0;">Order Cancelled Successfully</h2>
            <p style="color: #B0B0B0; font-size: 16px; line-height: 1.6;">Your order has been cancelled as requested.</p>
          </div>

          <div style="background: #1A1F2E; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #E0E0E0; margin: 5px 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p style="color: #E0E0E0; margin: 5px 0;"><strong>Refund Amount:</strong> £${(data.total / 100).toFixed(2)}</p>
            <p style="color: #B0B0B0; font-size: 14px; margin: 15px 0 0 0;">Your refund will be processed within 5-7 business days to your original payment method.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #B0B0B0; font-size: 16px; line-height: 1.6;">We're sorry to see you go! If you change your mind, we'd love to see you back.</p>
            <a href="https://infiniteclothingstore.co.uk/shop" style="display: inline-block; background: linear-gradient(135deg, #00D9FF 0%, #0099CC 100%); color: #0A0E1A; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; margin-top: 20px;">Continue Shopping</a>
          </div>

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #1A1F2E;">
            <p style="color: #666; font-size: 14px; margin: 5px 0;">Questions? Contact us at support@infiniteclothingstore.co.uk</p>
            <p style="color: #666; font-size: 12px; margin: 15px 0 0 0;">© 2024 INF!NITE C107HING. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const msg = {
    to: data.customerEmail,
    from: FROM_EMAIL,
    subject: `Order Cancelled - #${data.orderNumber}`,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Order cancellation email sent to ${data.customerEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending order cancellation email:', error);
    throw error;
  }
}
