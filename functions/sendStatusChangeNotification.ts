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
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
                </style>
            </head>
            <body style="margin: 0; padding: 20px; font-family: 'Heebo', Arial, sans-serif; background-color: #f0f4f8; direction: rtl;">
                <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                    
                    <!-- Header with gradient -->
                    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 25px 30px; position: relative;">
                        <div style="text-align: center;">
                            <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">פרטי דירה ${apartmentNumber}</h1>
                            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">${ownerName || 'לא צוין'} • ${phoneOwner}</p>
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div style="padding: 25px 30px;">
                        
                        <!-- Greeting -->
                        <div style="background-color: #eff6ff; border-right: 4px solid #3b82f6; padding: 15px 20px; margin-bottom: 25px; border-radius: 8px;">
                            <p style="font-size: 15px; color: #1e3a8a; margin: 0; line-height: 1.6; font-weight: 500;">
                                שלום,<br>
                                נשלח אליך מסמך זה בעקבות שינוי סטטוס משפטי בדירה הנ"ל:
                            </p>
                        </div>

                        <!-- Status Update Section -->
                        <div style="background: linear-gradient(to left, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #16a34a; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
                            <div style="background-color: rgba(255,255,255,0.9); border-radius: 8px; padding: 15px; margin-bottom: 12px;">
                                <p style="margin: 0 0 5px 0; font-size: 13px; color: #15803d; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">סטטוס משפטי</p>
                                <p style="margin: 0; font-size: 24px; font-weight: 700; color: #16a34a;">${statusName}</p>
                            </div>
                            ${oldStatusName ? `
                                <p style="margin: 0; font-size: 13px; color: #15803d;">
                                    עודכן מ: <span style="font-weight: 600;">${oldStatusName}</span>
                                </p>
                            ` : ''}
                        </div>

                        <!-- Main Details Grid -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; text-align: center;">
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; font-weight: 600;">מספר דירה</p>
                                <p style="margin: 0; font-size: 22px; font-weight: 700; color: #1e293b;">${apartmentNumber}</p>
                            </div>
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; text-align: center;">
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #64748b; font-weight: 600;">בעל דירה</p>
                                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1e293b;">${ownerName || 'לא צוין'}</p>
                            </div>
                        </div>

                        <!-- Debt Summary with Colored Borders -->
                        <div style="background: linear-gradient(to left, #fef2f2 0%, #fee2e2 100%); border: 3px solid #dc2626; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                            <h3 style="color: #991b1b; margin: 0 0 15px 0; font-size: 17px; text-align: center; font-weight: 700; letter-spacing: -0.3px;">
                                📋 פירוט חובות
                            </h3>
                            
                            <!-- Total Debt - Large -->
                            <div style="background-color: white; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);">
                                <p style="margin: 0 0 8px 0; font-size: 13px; color: #991b1b; font-weight: 600;">סה"כ חוב</p>
                                <p style="margin: 0; font-size: 36px; font-weight: 800; color: #dc2626; letter-spacing: -1px;">₪${totalDebt.toLocaleString('he-IL')}</p>
                            </div>

                            <!-- Breakdown Grid -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div style="background-color: white; border-right: 4px solid #f97316; border-radius: 8px; padding: 15px; text-align: center;">
                                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #9a3412; font-weight: 600;">דמי ניהול</p>
                                    <p style="margin: 0; font-size: 20px; font-weight: 700; color: #ea580c;">₪${monthlyDebt.toLocaleString('he-IL')}</p>
                                </div>
                                <div style="background-color: white; border-right: 4px solid #a855f7; border-radius: 8px; padding: 15px; text-align: center;">
                                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b21a8; font-weight: 600;">מים חמים</p>
                                    <p style="margin: 0; font-size: 20px; font-weight: 700; color: #9333ea;">₪${specialDebt.toLocaleString('he-IL')}</p>
                                </div>
                            </div>
                        </div>

                        ${managementMonthsRaw ? `
                            <!-- Management Months Section -->
                            <div style="background-color: #fefce8; border: 1px solid #facc15; border-radius: 10px; padding: 18px; margin-bottom: 25px;">
                                <h4 style="color: #854d0e; margin: 0 0 12px 0; font-size: 15px; font-weight: 700; display: flex; align-items: center;">
                                    📅 דמי ניהול לחודשים
                                </h4>
                                <div style="background-color: white; border-radius: 6px; padding: 12px; font-size: 13px; color: #78716c; line-height: 1.8;">
                                    ${managementMonthsRaw.split(/[,،\n]/).map(item => item.trim()).filter(item => item).map(item => `<div style="padding: 6px 0; border-bottom: 1px solid #fef3c7;"><span style="color: #ca8a04; font-weight: 600;">•</span> ${item}</div>`).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${comments && comments.length > 0 ? `
                            <!-- Comments Section with Clean Table -->
                            <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
                                <h4 style="color: #1e293b; margin: 0 0 15px 0; font-size: 15px; font-weight: 700; display: flex; align-items: center;">
                                    💬 הערות ותיעוד
                                </h4>
                                <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                                    <thead>
                                        <tr style="background: linear-gradient(to left, #1e40af 0%, #3b82f6 100%);">
                                            <th style="padding: 12px; text-align: right; color: white; font-size: 13px; font-weight: 600; border-left: 1px solid rgba(255,255,255,0.1); width: 25%;">תאריך</th>
                                            <th style="padding: 12px; text-align: right; color: white; font-size: 13px; font-weight: 600; border-left: 1px solid rgba(255,255,255,0.1); width: 20%;">מאת</th>
                                            <th style="padding: 12px; text-align: right; color: white; font-size: 13px; font-weight: 600; width: 55%;">תוכן</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${comments.map((comment, idx) => `
                                            <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background-color: #f8fafc;' : 'background-color: white;'}">
                                                <td style="padding: 12px; color: #64748b; font-size: 12px; vertical-align: top; border-left: 1px solid #e2e8f0;">
                                                    <div style="font-weight: 600;">${new Date(comment.created_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                                                    <div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">${new Date(comment.created_date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
                                                </td>
                                                <td style="padding: 12px; color: #1e40af; font-weight: 600; font-size: 13px; vertical-align: top; border-left: 1px solid #e2e8f0;">${comment.author_name}</td>
                                                <td style="padding: 12px; color: #475569; font-size: 13px; line-height: 1.6; vertical-align: top; white-space: pre-wrap;">${comment.content}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : ''}

                    </div>

                    <!-- Footer -->
                    <div style="background: linear-gradient(to bottom, #f8fafc 0%, #e2e8f0 100%); border-top: 1px solid #cbd5e1; padding: 20px 30px; text-align: center;">
                        <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6; font-weight: 500;">
                            🏢 הודעה זו נשלחה אוטומטית ממערכת ניהול חובות בניין אלמוג<br>
                            <span style="font-size: 11px; opacity: 0.8;">${new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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