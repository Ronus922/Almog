import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { debtorRecordId, statusName } = payload;
    
    if (!debtorRecordId || !statusName) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Get settings for email recipient
    const settingsList = await base44.asServiceRole.entities.Settings.list();
    const settings = settingsList[0];
    
    if (!settings?.legal_alert_email) {
      return Response.json({ 
        success: false, 
        message: 'No alert email configured in settings' 
      });
    }
    
    // Get debtor record
    const record = await base44.asServiceRole.entities.DebtorRecord.filter({ id: debtorRecordId });
    if (!record || record.length === 0) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }
    
    const debtor = record[0];
    
    // Check if current status should trigger alert
    if (!settings.legal_alert_statuses || settings.legal_alert_statuses.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'No statuses configured for alerts' 
      });
    }
    
    if (!debtor.legal_status_id || !settings.legal_alert_statuses.includes(debtor.legal_status_id)) {
      return Response.json({ 
        success: false, 
        message: 'Current status does not trigger alerts' 
      });
    }
    
    // Get comments
    const comments = await base44.asServiceRole.entities.Comment.filter(
      { debtor_record_id: debtorRecordId },
      '-created_date'
    );
    
    // Generate PDF content as HTML
    const formatCurrency = (num) => 
      new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num || 0);
    
    const formatPhone = (phone) => {
      if (!phone) return 'אין מספר';
      const cleaned = phone.replace(/\D/g, '');
      if (/^0+$/.test(cleaned)) return 'אין מספר';
      return phone;
    };
    
    const pdfHtml = `
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
            h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
            .section { margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px; }
            .section h3 { color: #334155; margin: 0 0 10px 0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .debt-section { background: #fef2f2; border: 2px solid #fca5a5; }
            .debt-total { font-size: 24px; font-weight: bold; color: #dc2626; }
            .comment { background: #f8fafc; border-right: 4px solid #3b82f6; padding: 12px; margin-bottom: 10px; }
            .comment-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <h1>פרטי דירה ${debtor.apartmentNumber}</h1>
          
          <div class="section">
            <h3>פרטים עיקריים</h3>
            <div class="grid">
              <div><strong>מספר דירה:</strong> ${debtor.apartmentNumber}</div>
              <div><strong>בעל דירה:</strong> ${debtor.ownerName || 'לא צוין'}</div>
              <div><strong>טלפון בעלים:</strong> ${formatPhone(debtor.phoneOwner)}</div>
              <div><strong>טלפון שוכר:</strong> ${formatPhone(debtor.phoneTenant)}</div>
            </div>
          </div>

          <div class="section">
            <h3>סטטוס משפטי</h3>
            <div style="font-weight: bold; font-size: 16px;">${statusName}</div>
          </div>

          <div class="section debt-section">
            <h3>פירוט חובות</h3>
            <div class="debt-total">סה״כ חוב: ${formatCurrency(debtor.totalDebt)}</div>
            <div class="grid" style="margin-top: 10px;">
              <div><strong>דמי ניהול:</strong> ${formatCurrency(debtor.monthlyDebt)}</div>
              <div><strong>מים חמים:</strong> ${formatCurrency(debtor.specialDebt)}</div>
            </div>
          </div>

          ${debtor.managementMonthsRaw ? `
            <div class="section">
              <h3>דמי ניהול לחודשים</h3>
              <div>${debtor.managementMonthsRaw}</div>
            </div>
          ` : ''}

          ${comments && comments.length > 0 ? `
            <div class="section">
              <h3>הערות ותיעוד</h3>
              ${comments.map(comment => `
                <div class="comment">
                  <div class="comment-header">
                    <strong>${comment.author_name}</strong>
                    <span>${new Date(comment.created_date).toLocaleString('he-IL')}</span>
                  </div>
                  <div>${comment.content}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
            נוצר ב-${new Date().toLocaleString('he-IL')} • מערכת ניהול חייבים
          </div>
        </body>
      </html>
    `;
    
    // Convert HTML to base64 for attachment
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(pdfHtml);
    const base64Html = btoa(String.fromCharCode(...htmlBytes));
    
    // Send email with HTML attachment
    const emailSubject = `התראה: שינוי סטטוס ל"${statusName}" - דירה ${debtor.apartmentNumber}`;
    const emailBody = `
שלום,

נשלח אליך מסמך פרטי דירה בעקבות שינוי סטטוס משפטי.

📋 פרטים:
- דירה: ${debtor.apartmentNumber}
- בעל דירה: ${debtor.ownerName || 'לא צוין'}
- סטטוס חדש: ${statusName}
- סה״כ חוב: ${formatCurrency(debtor.totalDebt)}

המסמך המלא מצורף כקובץ HTML (פתח בדפדפן).

בברכה,
מערכת ניהול חייבים
    `;
    
    await base44.integrations.Core.SendEmail({
      to: settings.legal_alert_email,
      subject: emailSubject,
      body: emailBody
    });
    
    return Response.json({ 
      success: true, 
      message: `Email sent to ${settings.legal_alert_email}` 
    });
    
  } catch (error) {
    console.error('Legal status alert error:', error);
    return Response.json({ 
      error: error.message || 'Unknown error' 
    }, { status: 500 });
  }
});