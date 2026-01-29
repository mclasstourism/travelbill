// Resend email integration for password reset
import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email};
}

export async function getResendClient() {
  const creds = await getCredentials();
  return {
    client: new Resend(creds.apiKey),
    fromEmail: creds.fromEmail
  };
}

export async function sendPasswordResetEmail(toEmail: string, resetCode: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    await client.emails.send({
      from: fromEmail || 'TravelBill <noreply@resend.dev>',
      to: toEmail,
      subject: 'Password Reset Code - TravelBill',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested a password reset for your TravelBill account.</p>
          <p>Your password reset code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #333;">${resetCode}</span>
          </div>
          <p>This code expires in 15 minutes.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #888; font-size: 12px;">TravelBill - Travel Agency Billing System</p>
        </div>
      `
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

export async function sendInvoiceEmail(toEmail: string, invoice: any): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const itemsHtml = invoice.items?.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">AED ${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">AED ${(item.quantity * item.unitPrice).toFixed(2)}</td>
      </tr>
    `).join('') || '';
    
    await client.emails.send({
      from: fromEmail || 'TravelBill <noreply@resend.dev>',
      to: toEmail,
      subject: `Invoice ${invoice.invoiceNumber} - Middle Class Tourism`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a5f2a; margin: 0;">Middle Class Tourism</h1>
            <p style="color: #666; margin: 5px 0;">Travel Agency Billing</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Invoice #${invoice.invoiceNumber}</h2>
            <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #1a5f2a; color: white;">
                <th style="padding: 12px 8px; text-align: left;">Description</th>
                <th style="padding: 12px 8px; text-align: center;">Qty</th>
                <th style="padding: 12px 8px; text-align: right;">Unit Price</th>
                <th style="padding: 12px 8px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="text-align: right; margin-top: 20px;">
            <p><strong>Subtotal:</strong> AED ${invoice.subtotal?.toFixed(2) || '0.00'}</p>
            ${invoice.discountAmount > 0 ? `<p><strong>Discount:</strong> -AED ${invoice.discountAmount.toFixed(2)}</p>` : ''}
            <p style="font-size: 18px; color: #1a5f2a;"><strong>Total:</strong> AED ${invoice.total?.toFixed(2) || '0.00'}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #888; font-size: 12px; text-align: center;">
            Thank you for your business!<br/>
            Middle Class Tourism - Your trusted travel partner
          </p>
        </div>
      `
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send invoice email:', error);
    return false;
  }
}

export async function sendPaymentReminderEmail(toEmail: string, invoiceNumber: string, amount: number, dueDate: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    await client.emails.send({
      from: fromEmail || 'TravelBill <noreply@resend.dev>',
      to: toEmail,
      subject: `Payment Reminder - Invoice ${invoiceNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #c0392b;">Payment Reminder</h2>
          <p>This is a friendly reminder about your outstanding payment.</p>
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-left: 4px solid #c0392b;">
            <p><strong>Invoice:</strong> ${invoiceNumber}</p>
            <p><strong>Amount Due:</strong> AED ${amount.toFixed(2)}</p>
            <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
          </div>
          <p>Please arrange for payment at your earliest convenience.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #888; font-size: 12px;">Middle Class Tourism - Travel Agency</p>
        </div>
      `
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send payment reminder email:', error);
    return false;
  }
}
