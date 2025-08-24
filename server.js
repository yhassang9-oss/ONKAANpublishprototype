const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver"); // ✅ for zipping
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

// --- Gmail transporter ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // Gmail
    pass: process.env.GMAIL_PASS  // Gmail App Password
  }
});

// Verify transporter
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

    // --- Temp directory ---
    const tempDir = path.join(__dirname, "temp_publish");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    // --- Save files ---
    fs.writeFileSync(path.join(tempDir, "index.html"), html || "");
    fs.writeFileSync(path.join(tempDir, "style.css"), css || "");
    fs.writeFileSync(path.join(tempDir, "script.js"), js || "");

    if (buynow) fs.writeFileSync(path.join(tempDir, "buynow.html"), buynow);
    if (product) fs.writeFileSync(path.join(tempDir, "product.html"), product);

    if (images && Array.isArray(images)) {
      images.forEach(img => {
        fs.writeFileSync(path.join(tempDir, img.name), Buffer.from(img.data, "base64"));
      });
    }

    // --- Zip the folder ---
    const zipPath = path.join(__dirname, `${projectName}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(tempDir, false);
    await archive.finalize();

    // Wait until zip is fully written
    output.on("close", async () => {
      console.log(`📦 Zipped ${archive.pointer()} total bytes`);

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER, // change if needed
        subject: `New Website Submission - ${projectName}`,
        text: "Attached is your website project as a ZIP file.",
        attachments: [
          {
            filename: `${projectName}.zip`,
            path: zipPath
          }
        ]
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log("📨 Email sent:", info.response);
        res.json({ success: true, message: "Files zipped & sent to Gmail!", info });
      } catch (err) {
        console.error("❌ Email send error:", err);
        res.status(500).json({ success: false, message: "Email send failed", error: err.message });
      }
    });
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
