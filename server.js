const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// verify transporter first
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Gmail transporter error:", error);
  } else {
    console.log("✅ Gmail transporter is ready to send emails.");
  }
});

app.post("/publish", (req, res) => {
  try {
    const { projectName, html, css, js, buynow, product, images } = req.body;

    if (!projectName) {
      return res.status(400).send({ success: false, message: "Project name is required" });
    }

    const attachments = [
      { filename: "index.html", content: html || "" },
      { filename: "style.css", content: css || "" },
      { filename: "script.js", content: js || "" }
    ];

    if (buynow) {
      attachments.push({ filename: "buynow.html", content: buynow });
    }
    if (product) {
      attachments.push({ filename: "product.html", content: product });
    }

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
      to: process.env.GMAIL_USER, // you can change this later
      subject: `New Website Submission - ${projectName}`,
      text: "Attached are the website files.",
      attachments
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("❌ Email send error:", error.message);
        return res.status(500).send({
          success: false,
          message: "Error sending email",
          error: error.message
        });
      }
      console.log("📨 Email sent:", info.response);
      res.send({ success: true, message: "Files sent to Gmail!", info });
    });
  } catch (err) {
    console.error("❌ Server error:", err.message);
    res.status(500).send({ success: false, message: "Internal server error", error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
