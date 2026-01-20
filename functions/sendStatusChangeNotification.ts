import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Resend } from 'npm:resend@4.0.1';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

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
            console.log('[EMAIL] ❌ NO EMAILS CONFIGURED - returning early');
            return Response.json({ 
                success: true, 
                message: 'אין כתובות מייל מוגדרות',
                results: [],
                debug: {
                    statusId: newStatusId,
                    statusName: newStatus.name || newStatus.data?.name,
                    rawStatus: newStatus
                }
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
        const statusName = newStatus.name || newStatus.data?.name;
        const statusDescription = newStatus.description || newStatus.data?.description || '';
        const oldStatusName = oldStatus ? (oldStatus.name || oldStatus.data?.name) : null;

        const subject = `שינוי סטטוס - דירה ${apartmentNumber}`;
        const htmlContent = `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af;">עדכון סטטוס משפטי</h2>
                <p><strong>דירה:</strong> ${apartmentNumber}</p>
                <p><strong>שם בעלים:</strong> ${ownerName}</p>
                <p><strong>סכום חוב:</strong> ₪${totalDebt.toLocaleString()}</p>
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                <p><strong>שינוי סטטוס:</strong></p>
                ${oldStatusName ? `<p>מ: <span style="color: #6b7280;">${oldStatusName}</span></p>` : ''}
                <p>ל: <span style="color: #059669; font-weight: bold;">${statusName}</span></p>
                ${statusDescription ? `<p><strong>תיאור:</strong> ${statusDescription}</p>` : ''}
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px;">הודעה זו נשלחה אוטומטית ממערכת ניהול החובות</p>
            </div>
        `;

        const results = [];
        console.log(`[EMAIL] 📧 Starting to send ${emailAddresses.length} emails...`);
        
        for (const email of emailAddresses) {
            try {
                console.log(`[EMAIL] Sending to: ${email}...`);
                
                const { data, error } = await resend.emails.send({
                    from: 'התראות <r@bios.co.il>',
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