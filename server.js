const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

// --- Gmail transporter ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // your Gmail
    pass: process.env.GMAIL_PASS  // Gmail app password
  }
});

// Verify transporter using async/await
async function verifyTransporter() {
  try {
    await transporter.verify();
    console.log("✅ Gmail transporter is ready to send emails.");
  } catch (err) {
    console.error("❌ Gmail transporter error:", err);
  }
}
verifyTransporter();

// --- Publish route ---
app.post("/publish", async (req, res) => {
  try {
    const { projectName, html, css, js, buynow, product, images } = req.body;

    if (!projectName) {
      return res.status(400).json({ success: false, message: "Project name is required" });
    }

    const attachments = [
      { filename: "index.html", content: html || "" },
      { filename: "style.css", content: css || "" },
      { filename: "script.js", content: js || "" }
    ];

    if (buynow) attachments.push({ filename: "buynow.html", content: buynow });
    if (product) attachments.push({ filename: "product.html", content: product });

    if (images && Array.isArray(images)) {
      images.forEach(img => {
        attachments.push({
          filename: img.name,
          content: Buffer.from(img.data, "base64"),
          encoding: "base64"
        });
      });
    }

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // change if needed
      subject: `New Website Submission - ${projectName}`,
      text: "Attached are the website files.",
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📨 Email sent:", info.response);
    res.json({ success: true, message: "Files sent to Gmail!", info });

  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
