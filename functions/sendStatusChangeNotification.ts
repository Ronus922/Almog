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
        
        const htmlContent = `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
            </head>
            <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f0f4f8; direction: rtl;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0f4f8;">
                    <tr>
                        <td align="center">
                            <table cellpadding="0" cellspacing="0" border="0" width="650" style="max-width: 650px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                                
                                <!-- Header -->
                                <tr>
                                    <td style="background-color: #1e3a8a; color: white; padding: 25px 30px; text-align: center;">
                                        <h1 style="margin: 0; font-size: 26px; font-weight: 700;">פרטי דירה ${apartmentNumber}</h1>
                                        <p style="margin: 8px 0 0 0; font-size: 14px;">${ownerName || 'לא צוין'} • ${phoneOwner}</p>
                                    </td>
                                </tr>

                                <!-- Main Content -->
                                <tr>
                                    <td style="padding: 25px 30px;">
                                        
                                        <!-- Greeting -->
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 25px;">
                                            <tr>
                                                <td style="background-color: #eff6ff; border-right: 4px solid #3b82f6; padding: 15px 20px; border-radius: 8px;">
                                                    <p style="font-size: 15px; color: #1e3a8a; margin: 0; line-height: 1.6; font-weight: 500;">
                                                        שלום,<br>
                                                        נשלח אליך מסמך זה בעקבות שינוי סטטוס משפטי בדירה הנ"ל:
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Status Update -->
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 25px;">
                                            <tr>
                                                <td style="background-color: #dcfce7; border: 2px solid #16a34a; border-radius: 12px; padding: 20px; text-align: center;">
                                                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="background-color: #ffffff; border-radius: 8px; padding: 15px; margin-bottom: 12px;">
                                                                <p style="margin: 0 0 5px 0; font-size: 13px; color: #15803d; font-weight: 600;">סטטוס משפטי</p>
                                                                <p style="margin: 0; font-size: 24px; font-weight: 700; color: #16a34a;">${statusName}</p>
                                                            </td>
                                                        </tr>
                                                        ${oldStatusName ? `
                                                        <tr>
                                                            <td>
                                                                <p style="margin: 12px 0 0 0; font-size: 13px; color: #15803d;">
                                                                    עודכן מ: <span style="font-weight: 600;">${oldStatusName}</span>
                                                                </p>
                                                            </td>
                                                        </tr>
                                                        ` : ''}
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Main Details - using table -->
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 25px;">
                                            <tr>
                                                <td width="48%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; text-align: center;">
                                                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; font-weight: 600;">מספר דירה</p>
                                                    <p style="margin: 0; font-size: 22px; font-weight: 700; color: #1e293b;">${apartmentNumber}</p>
                                                </td>
                                                <td width="4%"></td>
                                                <td width="48%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; text-align: center;">
                                                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; font-weight: 600;">בעל דירה</p>
                                                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1e293b;">${ownerName || 'לא צוין'}</p>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Debt Summary -->
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 25px;">
                                            <tr>
                                                <td style="background-color: #fee2e2; border: 3px solid #dc2626; border-radius: 12px; padding: 20px;">
                                                    <h3 style="color: #991b1b; margin: 0 0 15px 0; font-size: 17px; text-align: center; font-weight: 700;">פירוט חובות</h3>
                                                    
                                                    <!-- Total Debt -->
                                                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 15px;">
                                                        <tr>
                                                            <td style="background-color: white; border-radius: 10px; padding: 20px; text-align: center;">
                                                                <p style="margin: 0 0 8px 0; font-size: 13px; color: #991b1b; font-weight: 600;">סה"כ חוב</p>
                                                                <p style="margin: 0; font-size: 36px; font-weight: 800; color: #dc2626;">₪${totalDebt.toLocaleString('he-IL')}</p>
                                                            </td>
                                                        </tr>
                                                    </table>

                                                    <!-- Breakdown -->
                                                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                                        <tr>
                                                            <td width="48%" style="background-color: white; border-right: 4px solid #f97316; border-radius: 8px; padding: 15px; text-align: center;">
                                                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #9a3412; font-weight: 600;">דמי ניהול</p>
                                                                <p style="margin: 0; font-size: 20px; font-weight: 700; color: #ea580c;">₪${monthlyDebt.toLocaleString('he-IL')}</p>
                                                            </td>
                                                            <td width="4%"></td>
                                                            <td width="48%" style="background-color: white; border-right: 4px solid #a855f7; border-radius: 8px; padding: 15px; text-align: center;">
                                                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b21a8; font-weight: 600;">מים חמים</p>
                                                                <p style="margin: 0; font-size: 20px; font-weight: 700; color: #9333ea;">₪${specialDebt.toLocaleString('he-IL')}</p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        ${managementMonthsRaw ? `
                                        <!-- Management Months -->
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 25px;">
                                            <tr>
                                                <td style="background-color: #fefce8; border: 1px solid #facc15; border-radius: 10px; padding: 18px;">
                                                    <h4 style="color: #854d0e; margin: 0 0 12px 0; font-size: 15px; font-weight: 700;">דמי ניהול לחודשים</h4>
                                                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                                        <tr>
                                                            <td style="background-color: white; border-radius: 6px; padding: 12px; font-size: 13px; color: #78716c; line-height: 1.8;">
                                                                ${managementMonthsRaw.split(/[,،\n]/).map(item => item.trim()).filter(item => item).map(item => `<div style="padding: 6px 0; border-bottom: 1px solid #fef3c7;"><span style="color: #ca8a04; font-weight: 600;">•</span> ${item}</div>`).join('')}
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        ` : ''}

                                        ${comments && comments.length > 0 ? `
                                        <!-- Comments -->
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
                                            <tr>
                                                <td style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 18px;">
                                                    <h4 style="color: #1e293b; margin: 0 0 15px 0; font-size: 15px; font-weight: 700;">הערות ותיעוד</h4>
                                                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: white; border-radius: 8px;">
                                                        <thead>
                                                            <tr style="background-color: #1e40af;">
                                                                <th style="padding: 12px; text-align: right; color: white; font-size: 13px; font-weight: 600; border-left: 1px solid rgba(255,255,255,0.1); width: 25%;">תאריך</th>
                                                                <th style="padding: 12px; text-align: right; color: white; font-size: 13px; font-weight: 600; border-left: 1px solid rgba(255,255,255,0.1); width: 20%;">מאת</th>
                                                                <th style="padding: 12px; text-align: right; color: white; font-size: 13px; font-weight: 600; width: 55%;">תוכן</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            ${comments.map((comment, idx) => `
                                                                <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#f8fafc' : 'white'};">
                                                                    <td style="padding: 12px; color: #64748b; font-size: 12px; vertical-align: top; border-left: 1px solid #e2e8f0;">
                                                                        <div style="font-weight: 600;">${new Date(comment.created_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                                                                        <div style="font-size: 11px; margin-top: 2px;">${new Date(comment.created_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
                                                                    </td>
                                                                    <td style="padding: 12px; color: #1e40af; font-weight: 600; font-size: 13px; vertical-align: top; border-left: 1px solid #e2e8f0;">${comment.author_name}</td>
                                                                    <td style="padding: 12px; color: #475569; font-size: 13px; line-height: 1.6; vertical-align: top;">${comment.content}</td>
                                                                </tr>
                                                            `).join('')}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        ` : ''}

                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #e2e8f0; border-top: 1px solid #cbd5e1; padding: 20px 30px; text-align: center;">
                                        <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6; font-weight: 500;">
                                            הודעה זו נשלחה אוטומטית ממערכת ניהול חובות בניין אלמוג<br>
                                            <span style="font-size: 11px;">${new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </p>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

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