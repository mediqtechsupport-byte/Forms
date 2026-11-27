/**
 * MediQ Pharma Digital Forms — Free Google Mail API Bridge (Google Apps Script)
 *
 * Setup (takes ~60 seconds, 100% free, NO Google Cloud billing required):
 * 1. Sign in to the Gmail you want invitations sent FROM (e.g. mediqtechsupport@gmail.com)
 *    and open https://script.google.com/ -> click "New project".
 * 2. Paste this entire file into Code.gs, replace SHARED_SECRET below with a random password,
 *    and save.
 * 3. Click Deploy -> New deployment -> Select type: Web app
 *      - Execute as: Me (your Gmail)
 *      - Who has access: Anyone
 *    Click Deploy, authorize Gmail access, and copy the Web App URL (https://script.google.com/macros/s/.../exec).
 * 4. Share the Web App URL + SHARED_SECRET with your AI assistant (or add them as Supabase Edge Function secrets:
 *    GOOGLE_APPS_SCRIPT_URL and GOOGLE_APPS_SCRIPT_SECRET).
 */

const SHARED_SECRET = 'REPLACE_WITH_YOUR_SECRET_TOKEN';

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (SHARED_SECRET && payload.secret !== SHARED_SECRET) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: 'Unauthorized secret token.' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const to = String(payload.to || '').trim();
    const subject = String(payload.subject || 'MediQ Pharma Digital Forms Invitation').trim();
    const htmlBody = String(payload.htmlBody || '');
    const plainBody = String(payload.plainBody || 'You have been invited to MediQ Digital Forms.');
    const senderName = String(payload.senderName || 'MediQ Pharma Digital Forms');

    if (!to) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: 'Missing recipient email.' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: senderName,
    });

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
