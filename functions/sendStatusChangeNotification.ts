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
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5; direction: rtl;">
                <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-bottom: 4px solid #1e3a8a;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">פרטי דירה ${apartmentNumber}</h1>
                    </div>

                    <!-- Main Content -->
                    <div style="padding: 30px;">
                        
                        <!-- Greeting -->
                        <p style="font-size: 16px; color: #1f2937; margin: 0 0 25px 0; line-height: 1.6;">
                            שלום,<br>
                            נשלח אליך מסמך זה בעקבות שינוי סטטוס משפטי בדירה הנ"ל:
                        </p>

                        <!-- Main Details Card -->
                        <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                            <h2 style="color: #1e40af; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #dbeafe; padding-bottom: 10px;">פרטים עיקריים</h2>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; width: 40%; font-weight: bold; color: #334155;">מספר דירה:</td>
                                    <td style="padding: 8px 0; color: #1f2937;">${apartmentNumber}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #334155;">בעל דירה:</td>
                                    <td style="padding: 8px 0; color: #1f2937;">${ownerName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #334155;">טלפון שוכר:</td>
                                    <td style="padding: 8px 0; color: #1f2937; direction: ltr; text-align: right;">${phoneOwner}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Legal Status Card -->
                        <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
                            <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 18px;">סטטוס משפטי</h3>
                            <div style="background-color: white; border-radius: 6px; padding: 12px; margin-bottom: 10px;">
                                <p style="margin: 0; font-size: 20px; font-weight: bold; color: #059669;">${statusName}</p>
                            </div>
                            ${oldStatusName ? `
                                <p style="margin: 5px 0 0 0; font-size: 14px; color: #475569;">
                                    עודכן מ: <span style="font-weight: bold;">${oldStatusName}</span>
                                </p>
                            ` : ''}
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">
                                עודכן: ${new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>

                        <!-- Debt Summary Card -->
                        <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border: 3px solid #dc2626; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                            <h3 style="color: #991b1b; margin: 0 0 15px 0; font-size: 18px; text-align: center;">פירוט חובות</h3>
                            <div style="background-color: white; border-radius: 6px; padding: 20px; text-align: center; margin-bottom: 15px;">
                                <p style="margin: 0 0 5px 0; font-size: 14px; color: #991b1b; font-weight: bold;">סה"כ חוב</p>
                                <p style="margin: 0; font-size: 32px; font-weight: bold; color: #dc2626;">₪${totalDebt.toLocaleString('he-IL')}</p>
                            </div>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; text-align: center; border-left: 1px solid #fca5a5;">
                                        <div style="font-weight: bold; color: #991b1b; margin-bottom: 5px;">דמי ניהול</div>
                                        <div style="font-size: 18px; color: #dc2626; font-weight: bold;">₪${monthlyDebt.toLocaleString('he-IL')}</div>
                                    </td>
                                    <td style="padding: 8px; text-align: center;">
                                        <div style="font-weight: bold; color: #991b1b; margin-bottom: 5px;">מים חמים</div>
                                        <div style="font-size: 18px; color: #dc2626; font-weight: bold;">₪${specialDebt.toLocaleString('he-IL')}</div>
                                    </td>
                                </tr>
                            </table>
                        </div>

                        ${managementMonthsRaw ? `
                            <!-- Management Months -->
                            <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                                <h3 style="color: #334155; margin: 0 0 10px 0; font-size: 16px;">דמי ניהול לחודשים</h3>
                                <div style="background-color: white; border-radius: 6px; padding: 12px; font-size: 14px; color: #475569; line-height: 1.8;">
                                    ${managementMonthsRaw.split(/[,،\n]/).map(item => item.trim()).filter(item => item).map(item => `<div style="padding: 4px 0; border-bottom: 1px solid #f1f5f9;">• ${item}</div>`).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${comments && comments.length > 0 ? `
                            <!-- Comments Section -->
                            <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                                <h3 style="color: #334155; margin: 0 0 15px 0; font-size: 16px;">הערות ותיעוד</h3>
                                <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 6px; overflow: hidden;">
                                    <thead>
                                        <tr style="background-color: #3b82f6; color: white;">
                                            <th style="padding: 12px; text-align: right; border-left: 1px solid #2563eb; width: 25%;">תאריך</th>
                                            <th style="padding: 12px; text-align: right; border-left: 1px solid #2563eb; width: 20%;">מאת</th>
                                            <th style="padding: 12px; text-align: right; width: 55%;">תוכן</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${comments.map((comment, idx) => `
                                            <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background-color: #f8fafc;' : 'background-color: white;'}">
                                                <td style="padding: 12px; color: #64748b; font-size: 13px; vertical-align: top; border-left: 1px solid #e2e8f0;">
                                                    ${new Date(comment.created_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}<br>
                                                    <span style="font-size: 11px;">${new Date(comment.created_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td style="padding: 12px; color: #1e40af; font-weight: bold; font-size: 13px; vertical-align: top; border-left: 1px solid #e2e8f0;">${comment.author_name}</td>
                                                <td style="padding: 12px; color: #475569; font-size: 13px; line-height: 1.6; vertical-align: top; white-space: pre-wrap;">${comment.content}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : ''}

                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f8fafc; border-top: 2px solid #e2e8f0; padding: 20px; text-align: center;">
                        <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                            הודעה זו נשלחה אוטומטית ממערכת ניהול חובות בניין אלמוג<br>
                            ${new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                </div>
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