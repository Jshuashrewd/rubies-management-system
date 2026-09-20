import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.REPORT_EMAIL_FROM ?? 'Rubies Code School <reports@rubiescodeschool.com>';

export interface ReportEmailData {
  guardianEmail: string;
  guardianName: string | null;
  studentFirstName: string;
  classTitle: string;
  trainerName: string;
  attendance: string;
  participation: number;
  topicsCovered: string;
  strengths: string;
  areasToImprove: string;
  homework: string | null;
  trainerComments: string;
  stageCompleted: boolean;
  stageTitle: string;
}

export async function sendReportEmail(data: ReportEmailData): Promise<void> {
  const greeting = data.guardianName ? `Dear ${data.guardianName},` : 'Hello,';

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Class Report — ${data.studentFirstName}</h2>
      <p>${greeting}</p>
      <p>Here's a report from ${data.studentFirstName}'s recent class, <strong>${data.classTitle}</strong>, with ${data.trainerName}.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 0;"><strong>Attendance:</strong></td><td>${data.attendance}</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Participation:</strong></td><td>${data.participation}/5</td></tr>
        <tr><td style="padding: 4px 0;"><strong>Curriculum stage:</strong></td><td>${data.stageTitle}${data.stageCompleted ? ' (completed ✅)' : ''}</td></tr>
      </table>
      <p><strong>Topics covered:</strong><br/>${data.topicsCovered}</p>
      <p><strong>Strengths:</strong><br/>${data.strengths}</p>
      <p><strong>Areas to improve:</strong><br/>${data.areasToImprove}</p>
      ${data.homework ? `<p><strong>Homework:</strong><br/>${data.homework}</p>` : ''}
      <p><strong>Trainer's comments:</strong><br/>${data.trainerComments}</p>
      <hr />
      <p style="color: #888; font-size: 12px;">Sent automatically by Rubies Code School.</p>
    </div>
  `;

  if (!resend) {
    // No API key configured (e.g. local dev) — log instead of failing the
    // whole request, so report submission still works while email is
    // being set up.
    console.warn('[email] RESEND_API_KEY not set — skipping send. Would have sent to:', data.guardianEmail);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: data.guardianEmail,
    subject: `Class Report: ${data.studentFirstName} — ${data.classTitle}`,
    html,
  });
}
