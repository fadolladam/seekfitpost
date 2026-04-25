const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // --- CONFIGURATION ---
  const LOGO_URL = 'https://i.ibb.co/TMhCH7ML/seekfitjob-logo.png'; 

  // Zoho SMTP Settings
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user: 'hr@seekfitjob.com',
      pass: 'hZE4FodxE!m!i!kCF9Me',
    },
  });

  try {
    // Professional HTML Signature Block
    const htmlSignature = `
      <br><br>
      <table cellpadding="0" cellspacing="0" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; border-top: 1px solid #f1f5f9;">
        <tr>
          <td style="padding-top: 20px; padding-right: 24px; border-right: 2px solid #4f46e5; vertical-align: top;">
            <div style="width: 80px; height: 80px; border-radius: 12px; overflow: hidden;">
               <img src="${LOGO_URL}" alt="SeekFit Logo" style="width: 80px; height: 80px; display: block; object-fit: contain;">
            </div>
          </td>
          <td style="padding-top: 20px; padding-left: 24px; vertical-align: top;">
            <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">SeekFitJob HR Department</div>
            <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 12px;">Human Resources</div>
            
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">SeekFitJob</div>
            <div style="font-size: 12px; color: #475569; font-weight: 500; margin-bottom: 12px;">Seek your fit, move a great forward.</div>
            
            <div style="font-size: 12px; font-weight: 600; color: #4f46e5; margin-bottom: 4px;">
                <a href="https://seekfitjob.com" style="color: #4f46e5; text-decoration: none;">seekfitjob.com</a>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #4f46e5; margin-bottom: 4px;">
                <a href="mailto:hr@seekfitjob.com" style="color: #4f46e5; text-decoration: none;">hr@seekfitjob.com</a>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #4f46e5;">Tel : 085 558 404</div>

            <div style="margin-top: 16px; display: flex; gap: 8px;">
                <a href="https://t.me/SeekFitJobKH" style="text-decoration: none;">
                    <img src="https://cdn-icons-png.flaticon.com/32/2111/2111646.png" width="24" height="24" style="display: block; border: 0;" alt="Telegram">
                </a>
                <a href="https://www.facebook.com/SeekfitJob" style="text-decoration: none; margin-left: 8px;">
                    <img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" width="24" height="24" style="display: block; border: 0;" alt="Facebook">
                </a>
                <a href="https://www.linkedin.com/company/seekfitjob/" style="text-decoration: none; margin-left: 8px;">
                    <img src="https://cdn-icons-png.flaticon.com/32/3536/3536505.png" width="24" height="24" style="display: block; border: 0;" alt="LinkedIn">
                </a>
            </div>
          </td>
        </tr>
      </table>
    `;

    await transporter.sendMail({
      from: '"Support & HR – SeekFitJob" <hr@seekfitjob.com>',
      to,
      subject,
      html: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #334155;">${body.replace(/\n/g, '<br>')}</div>${htmlSignature}`,
    });

    return res.status(200).json({ success: true, message: 'Email sent successfully!' });
  } catch (error) {
    console.error('SMTP Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
