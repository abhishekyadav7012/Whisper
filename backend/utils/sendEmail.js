const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (email, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Aapka Gmail address
        pass: process.env.EMAIL_PASS  // Google se mila 16-digit App Password
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: text
    };

    await transporter.sendMail(mailOptions);
    console.log("OTP Email sent successfully to:", email);
  } catch (error) {
    console.error("Nodemailer Error:", error);
  }
};

module.exports = sendEmail;