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

        if (!debtorRecordId || !newStatusId) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const debtorRecord = await base44.asServiceRole.entities.DebtorRecord.get(debtorRecordId);
        if (!debtorRecord) {
            return Response.json({ error: 'Debtor record not found' }, { status: 404 });
        }

        const newStatus = await base44.asServiceRole.entities.Status.get(newStatusId);
        if (!newStatus) {
            return Response.json({ error: 'New status not found' }, { status: 404 });
        }

        let oldStatus = null;
        if (oldStatusId) {
            oldStatus = await base44.asServiceRole.entities.Status.get(oldStatusId);
        }

        const notificationEmails = newStatus.data?.notification_emails || newStatus.notification_emails;
        if (!notificationEmails || notificationEmails.trim() === '') {
            return Response.json({ 
                success: true, 
                message: 'אין כתובות מייל מוגדרות',
                results: []
            });
        }

        const emailAddresses = notificationEmails
            .split(/[,;\n]/)
            .map(email => email.trim())
            .filter(email => email.length > 0);

        if (emailAddresses.length === 0) {
            return Response.json({ 
                success: true, 
                message: 'לא נמצאו כתובות מייל תקינות',
                results: []
            });
        }

        const subject = `שינוי סטטוס - דירה ${debtorRecord.data?.apartmentNumber || debtorRecord.apartmentNumber}`;
        const htmlContent = `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af;">עדכון סטטוס משפטי</h2>
                <p><strong>דירה:</strong> ${debtorRecord.data?.apartmentNumber || debtorRecord.apartmentNumber}</p>
                <p><strong>שם בעלים:</strong> ${debtorRecord.data?.ownerName || debtorRecord.ownerName || 'לא צוין'}</p>
                <p><strong>סכום חוב:</strong> ₪${(debtorRecord.data?.totalDebt || debtorRecord.totalDebt || 0).toLocaleString()}</p>
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                <p><strong>שינוי סטטוס:</strong></p>
                ${oldStatus ? `<p>מ: <span style="color: #6b7280;">${oldStatus.data?.name || oldStatus.name}</span></p>` : ''}
                <p>ל: <span style="color: #059669; font-weight: bold;">${newStatus.data?.name || newStatus.name}</span></p>
                ${(newStatus.data?.description || newStatus.description) ? `<p><strong>תיאור:</strong> ${newStatus.data?.description || newStatus.description}</p>` : ''}
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px;">הודעה זו נשלחה אוטומטית ממערכת ניהול החובות</p>
            </div>
        `;

        const results = [];
        for (const email of emailAddresses) {
            try {
                const { data, error } = await resend.emails.send({
                    from: 'התראות <r@bios.co.il>',
                    to: [email],
                    subject: subject,
                    html: htmlContent,
                });

                if (error) {
                    results.push({ email, success: false, error: error.message || JSON.stringify(error) });
                } else {
                    results.push({ email, success: true, messageId: data.id });
                }
            } catch (err) {
                results.push({ email, success: false, error: err.message });
            }
        }

        const successCount = results.filter(r => r.success).length;

        return Response.json({
            success: true,
            message: `נשלחו ${successCount}/${emailAddresses.length} מיילים`,
            results,
            summary: {
                total: emailAddresses.length,
                success: successCount,
                failed: emailAddresses.length - successCount
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});