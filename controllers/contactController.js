// controllers/contactController.js
const nodemailer = require("nodemailer");

const sendContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ error: "Name, Email, and Message are required." });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: "qualityedgeservice@gmail.com",
      subject: subject ? `📌 ${subject}` : "📩 New Contact Form Submission",
      html: `
        <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px; line-height: 1.6;">
          <div style="max-width: 650px; margin: auto; background: #ffffff; border-radius: 8px; box-shadow: 0 3px 10px rgba(0,0,0,0.1); overflow: hidden;">
            
            <!-- Header -->
            <div style="background: #0d9488; color: #ffffff; padding: 18px 25px; text-align: center;">
              <h2 style="margin: 0; font-size: 22px;">📩 Website Contact Form</h2>
              <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">A new enquiry has been submitted</p>
            </div>

            <!-- Body -->
            <div style="padding: 20px 25px; color: #333;">
              <h3 style="margin-bottom: 10px; font-size: 18px; color: #0f172a;">Contact Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>👤 Name</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>📧 Email</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>📞 Phone</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${phone || "Not Provided"}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>📝 Subject</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${subject || "Not Provided"}</td>
                </tr>
              </table>

              <h3 style="margin: 20px 0 10px; font-size: 18px; color: #0f172a;">Message</h3>
              <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; font-size: 14px; color: #1e293b; white-space: pre-line;">
                ${message}
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 15px; text-align: center; font-size: 13px; color: #64748b;">
              <p style="margin: 0;">This email was automatically generated from the <strong>Quality Edge Services</strong> website contact form.</p>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send message. Please try again later." });
  }
};

module.exports = { sendContactForm };
