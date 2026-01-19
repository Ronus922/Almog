import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { debtorRecordId, newStatusId, statusName } = payload;
    
    if (!debtorRecordId || !statusName || !newStatusId) {
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
    
    // Check if new status should trigger alert
    if (!settings.legal_alert_statuses || settings.legal_alert_statuses.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'No statuses configured for alerts' 
      });
    }
    
    if (!settings.legal_alert_statuses.includes(newStatusId)) {
      return Response.json({ 
        success: false, 
        message: 'New status does not trigger alerts' 
      });
    }
    
    // Get debtor record
    const record = await base44.asServiceRole.entities.DebtorRecord.filter({ id: debtorRecordId });
    if (!record || record.length === 0) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }
    
    const debtor = record[0];
    
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
    
    // Send styled HTML email
    const emailSubject = `🚨 התראה: שינוי סטטוס ל"${statusName}" - דירה ${debtor.apartmentNumber}`;
    const emailBody = `
<!DOCTYPE html>
<html dir="rtl">
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; direction: rtl; margin: 0; padding: 0; background-color: #f3f4f6; }
      .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px 20px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; }
      .alert-badge { display: inline-block; background: #fef2f2; color: #dc2626; padding: 8px 16px; border-radius: 8px; margin-top: 10px; font-weight: bold; font-size: 16px; }
      .content { padding: 30px 20px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
      .info-item { background: #f8fafc; padding: 15px; border-radius: 8px; border-right: 4px solid #3b82f6; }
      .info-label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
      .info-value { font-size: 16px; font-weight: bold; color: #1e293b; }
      .debt-section { background: #fef2f2; border: 2px solid #fca5a5; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
      .debt-total { font-size: 32px; font-weight: bold; color: #dc2626; margin-bottom: 10px; }
      .debt-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; }
      .debt-item { background: white; padding: 10px; border-radius: 6px; }
      .section { margin: 20px 0; }
      .section-title { font-size: 18px; font-weight: bold; color: #334155; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
      .comment { background: #f8fafc; border-right: 4px solid #3b82f6; padding: 15px; margin-bottom: 10px; border-radius: 6px; }
      .comment-header { font-size: 12px; color: #64748b; margin-bottom: 8px; }
      .comment-author { font-weight: bold; color: #1e40af; }
      .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🔔 התראת שינוי סטטוס משפטי</h1>
        <div class="alert-badge">${statusName}</div>
      </div>
      
      <div class="content">
        <p style="font-size: 16px; color: #475569; margin-bottom: 25px;">
          שלום,<br><br>
          התקבל עדכון על שינוי סטטוס משפטי בדירה ${debtor.apartmentNumber}. להלן פרטים מלאים:
        </p>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">🏠 מספר דירה</div>
            <div class="info-value">${debtor.apartmentNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">👤 בעל דירה</div>
            <div class="info-value">${debtor.ownerName || 'לא צוין'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">📞 טלפון בעלים</div>
            <div class="info-value">${formatPhone(debtor.phoneOwner)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">📞 טלפון שוכר</div>
            <div class="info-value">${formatPhone(debtor.phoneTenant)}</div>
          </div>
        </div>

        <div class="debt-section">
          <div style="font-size: 14px; color: #991b1b; font-weight: bold; margin-bottom: 10px;">💰 פירוט חובות</div>
          <div class="debt-total">סה״כ חוב: ${formatCurrency(debtor.totalDebt)}</div>
          <div class="debt-breakdown">
            <div class="debt-item">
              <div style="font-size: 12px; color: #64748b;">דמי ניהול</div>
              <div style="font-size: 16px; font-weight: bold; color: #dc2626;">${formatCurrency(debtor.monthlyDebt)}</div>
            </div>
            <div class="debt-item">
              <div style="font-size: 12px; color: #64748b;">מים חמים</div>
              <div style="font-size: 16px; font-weight: bold; color: #dc2626;">${formatCurrency(debtor.specialDebt)}</div>
            </div>
          </div>
        </div>

        ${debtor.managementMonthsRaw ? `
          <div class="section">
            <div class="section-title">📅 דמי ניהול לחודשים</div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-size: 14px;">
              ${debtor.managementMonthsRaw}
            </div>
          </div>
        ` : ''}

        ${comments && comments.length > 0 ? `
          <div class="section">
            <div class="section-title">💬 הערות ותיעוד (${comments.length})</div>
            ${comments.map(comment => `
              <div class="comment">
                <div class="comment-header">
                  <span class="comment-author">${comment.author_name}</span>
                  <span style="float: left;">${new Date(comment.created_date).toLocaleString('he-IL')}</span>
                </div>
                <div style="clear: both; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${comment.content}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div class="footer">
        נוצר אוטומטית ב-${new Date().toLocaleString('he-IL')}<br>
        מערכת ניהול חייבים • ${settings.buildingName || 'בניין אלמוג'}
      </div>
    </div>
  </body>
</html>
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