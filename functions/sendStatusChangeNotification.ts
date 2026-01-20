import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Resend } from 'npm:resend@4.0.1';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { debtorRecordId, oldStatusId, newStatusId } = await req.json();
        console.log('[EMAIL] Request params:', { debtorRecordId, oldStatusId, newStatusId });

        if (!debtorRecordId || !newStatusId) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const debtorRecord = await base44.asServiceRole.entities.DebtorRecord.get(debtorRecordId);
        console.log('[EMAIL] Debtor record:', JSON.stringify(debtorRecord, null, 2));
        
        if (!debtorRecord) {
            return Response.json({ error: 'Debtor record not found' }, { status: 404 });
        }

        const newStatus = await base44.asServiceRole.entities.Status.get(newStatusId);
        console.log('[EMAIL] New status FULL object:', JSON.stringify(newStatus, null, 2));
        
        if (!newStatus) {
            return Response.json({ error: 'New status not found' }, { status: 404 });
        }

        let oldStatus = null;
        if (oldStatusId) {
            oldStatus = await base44.asServiceRole.entities.Status.get(oldStatusId);
            console.log('[EMAIL] Old status:', JSON.stringify(oldStatus, null, 2));
        }

        // Support both data structures: {notification_emails: ...} and {data: {notification_emails: ...}}
        const notificationEmails = newStatus.notification_emails || newStatus.data?.notification_emails || '';
        console.log('[EMAIL] Extracted notification_emails:', notificationEmails);

        if (!notificationEmails || notificationEmails.trim() === '') {
            const statusName = newStatus.name || newStatus.data?.name || 'לא ידוע';
            console.log(`[EMAIL] ❌ NO EMAILS CONFIGURED for status: ${statusName}`);
            return Response.json({ 
                success: true, 
                message: `אין כתובות מייל מוגדרות לסטטוס "${statusName}"`,
                results: []
            });
        }

        const emailAddresses = notificationEmails
            .split(/[,;\n]/)
            .map(email => email.trim())
            .filter(email => email.length > 0);

        console.log('[EMAIL] Parsed email addresses:', emailAddresses);

        if (emailAddresses.length === 0) {
            console.log('[EMAIL] ❌ NO VALID EMAILS after parsing');
            return Response.json({ 
                success: true, 
                message: 'לא נמצאו כתובות מייל תקינות',
                results: []
            });
        }

        const apartmentNumber = debtorRecord.apartmentNumber || debtorRecord.data?.apartmentNumber;
        const ownerName = debtorRecord.ownerName || debtorRecord.data?.ownerName || 'לא צוין';
        const totalDebt = debtorRecord.totalDebt || debtorRecord.data?.totalDebt || 0;
        const monthlyDebt = debtorRecord.monthlyDebt || debtorRecord.data?.monthlyDebt || 0;
        const specialDebt = debtorRecord.specialDebt || debtorRecord.data?.specialDebt || 0;
        const phoneOwner = debtorRecord.phoneOwner || debtorRecord.data?.phoneOwner || 'אין מספר';
        const managementMonthsRaw = debtorRecord.managementMonthsRaw || debtorRecord.data?.managementMonthsRaw || '';
        const statusName = newStatus.name || newStatus.data?.name;
        const statusDescription = newStatus.description || newStatus.data?.description || '';
        const oldStatusName = oldStatus ? (oldStatus.name || oldStatus.data?.name) : null;

        // Fetch comments for this debtor
        const comments = await base44.asServiceRole.entities.Comment.filter({ debtor_record_id: debtorRecordId }, '-created_date');

        const subject = `שינוי סטטוס משפטי - דירה ${apartmentNumber}`;
        
        // Format numbers with RTL support
        const formatCurrency = (num) => {
            const formatted = num.toLocaleString('en-US');
            return `₪${formatted}`;
        };
        
        // Build simple HTML to avoid CPU timeout
        let htmlContent = `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f0f4f8;direction:rtl">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto">
<tr>
<td>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
<tr>
<td style="background:#1e3a8a;color:#fff;padding:25px;text-align:center">
<h1 style="margin:0;font-size:26px;font-weight:700">פרטי דירה ${apartmentNumber}</h1>
<p style="margin:8px 0 0;font-size:14px">${ownerName || 'לא צוין'} • ${phoneOwner}</p>
</td>
</tr>
<tr>
<td style="padding:25px">
<table cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td style="background:#eff6ff;border-right:4px solid #3b82f6;padding:15px;margin-bottom:25px;border-radius:8px">
<p style="font-size:15px;color:#1e3a8a;margin:0">שלום,<br>נשלח אליך מסמך זה בעקבות שינוי סטטוס משפטי בדירה הנ"ל:</p>
</td>
</tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:25px">
<tr>
<td style="background:#dcfce7;border:2px solid #16a34a;border-radius:12px;padding:20px;text-align:center">
<table cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td style="background:#fff;border-radius:8px;padding:15px">
<p style="margin:0 0 5px;font-size:13px;color:#15803d;font-weight:600">סטטוס משפטי</p>
<p style="margin:0;font-size:24px;font-weight:700;color:#16a34a">${statusName}</p>
</td>
</tr>
</table>`;
        
        if (oldStatusName) {
            htmlContent += `<tr><td style="padding-top:12px;font-size:13px;color:#15803d;text-align:center">עודכן מ: <span style="font-weight:600">${oldStatusName}</span></td></tr>`;
        }
        
        htmlContent += `</td>
</tr>
</table>
</td>
</tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:25px">
<tr>
<td width="48%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:15px;text-align:center">
<p style="margin:0 0 5px;font-size:12px;color:#64748b;font-weight:600">מספר דירה</p>
<p style="margin:0;font-size:22px;font-weight:700;color:#1e293b">${apartmentNumber}</p>
</td>
<td width="4%"></td>
<td width="48%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:15px;text-align:center">
<p style="margin:0 0 5px;font-size:12px;color:#64748b;font-weight:600">בעל דירה</p>
<p style="margin:0;font-size:16px;font-weight:600;color:#1e293b">${ownerName || 'לא צוין'}</p>
</td>
</tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fee2e2;border:3px solid #dc2626;border-radius:12px;padding:20px;margin-bottom:25px">
<tr>
<td>
<h3 style="color:#991b1b;margin:0 0 15px;font-size:17px;text-align:center;font-weight:700">פירוט חובות</h3>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff;border-radius:10px;padding:20px;margin-bottom:15px">
<tr>
<td style="text-align:center">
<p style="margin:0 0 8px;font-size:13px;color:#991b1b;font-weight:600">סה"כ חוב</p>
<p style="margin:0;font-size:36px;font-weight:800;color:#dc2626">₪${totalDebt.toLocaleString('he-IL')}</p>
</td>
</tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
<td width="48%" style="background:#fff;border-right:4px solid #f97316;border-radius:8px;padding:15px;text-align:center">
<p style="margin:0 0 5px;font-size:12px;color:#9a3412;font-weight:600">דמי ניהול</p>
<p style="margin:0;font-size:20px;font-weight:700;color:#ea580c">₪${monthlyDebt.toLocaleString('he-IL')}</p>
</td>
<td width="4%"></td>
<td width="48%" style="background:#fff;border-right:4px solid #a855f7;border-radius:8px;padding:15px;text-align:center">
<p style="margin:0 0 5px;font-size:12px;color:#6b21a8;font-weight:600">מים חמים</p>
<p style="margin:0;font-size:20px;font-weight:700;color:#9333ea">₪${specialDebt.toLocaleString('he-IL')}</p>
</td>
</tr>
</table>
</td>
</tr>
</table>`;

        if (managementMonthsRaw) {
            const months = managementMonthsRaw.split(/[,،\n]/).map(m => m.trim()).filter(m => m).slice(0, 10);
            htmlContent += `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fefce8;border:1px solid #facc15;border-radius:10px;padding:18px;margin-bottom:25px">
<tr>
<td>
<h4 style="color:#854d0e;margin:0 0 12px;font-size:15px;font-weight:700">דמי ניהול לחודשים</h4>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff;border-radius:6px;padding:12px">
<tr>
<td style="font-size:13px;color:#78716c">`;
            months.forEach(m => {
                htmlContent += `<div style="padding:6px 0;border-bottom:1px solid #fef3c7"><span style="color:#ca8a04">•</span> ${m}</div>`;
            });
            htmlContent += `</td>
</tr>
</table>
</td>
</tr>
</table>`;
        }

        if (comments && comments.length > 0) {
            const limitedComments = comments.slice(0, 5);
            htmlContent += `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:10px;padding:18px;margin-bottom:20px">
<tr>
<td>
<h4 style="color:#1e293b;margin:0 0 15px;font-size:15px;font-weight:700">הערות ותיעוד</h4>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fff;border-radius:8px">
<tr style="background:#1e40af">
<th style="padding:12px;text-align:right;color:#fff;font-size:13px;width:25%">תאריך</th>
<th style="padding:12px;text-align:right;color:#fff;font-size:13px;width:20%">מאת</th>
<th style="padding:12px;text-align:right;color:#fff;font-size:13px;width:55%">תוכן</th>
</tr>`;
            limitedComments.forEach((c, i) => {
                const bg = i % 2 === 0 ? '#f8fafc' : '#fff';
                const date = new Date(c.created_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                htmlContent += `<tr style="background:${bg};border-bottom:1px solid #e2e8f0">
<td style="padding:12px;color:#64748b;font-size:12px">${date}</td>
<td style="padding:12px;color:#1e40af;font-weight:600;font-size:13px">${c.author_name}</td>
<td style="padding:12px;color:#475569;font-size:13px">${c.content.substring(0, 100)}</td>
</tr>`;
            });
            htmlContent += `</table>
</td>
</tr>
</table>`;
        }

        htmlContent += `</td>
</tr>
<tr>
<td style="background:#e2e8f0;border-top:1px solid #cbd5e1;padding:20px;text-align:center">
<p style="margin:0;color:#64748b;font-size:12px">הודעה זו נשלחה אוטומטית ממערכת ניהול חובות בניין אלמוג</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;

        const results = [];
        console.log(`[EMAIL] 📧 Starting to send ${emailAddresses.length} emails...`);
        
        for (const email of emailAddresses) {
            try {
                console.log(`[EMAIL] Sending to: ${email}...`);
                
                const { data, error } = await resend.emails.send({
                    from: 'מנהל חובות בניין אלמוג <r@mail.bios.co.il>',
                    to: [email],
                    subject: subject,
                    html: htmlContent,
                });

                if (error) {
                    console.error(`[EMAIL] ❌ FAILED to ${email}:`, error);
                    results.push({ email, success: false, error: error.message || JSON.stringify(error) });
                } else {
                    console.log(`[EMAIL] ✅ SUCCESS to ${email}, messageId:`, data.id);
                    results.push({ email, success: true, messageId: data.id });
                }
            } catch (err) {
                console.error(`[EMAIL] ❌ EXCEPTION for ${email}:`, err);
                results.push({ email, success: false, error: err.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;

        console.log(`[EMAIL] 📊 FINAL SUMMARY: ${successCount} success, ${failedCount} failed`);
        console.log('[EMAIL] Full results:', JSON.stringify(results, null, 2));

        return Response.json({
            success: true,
            message: `נשלחו ${successCount}/${emailAddresses.length} מיילים`,
            results,
            summary: {
                total: emailAddresses.length,
                success: successCount,
                failed: failedCount
            }
        });

    } catch (error) {
        console.error('[EMAIL] ❌ FATAL ERROR:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});