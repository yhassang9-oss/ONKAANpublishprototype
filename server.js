const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "25mb" })); // bigger limit for images

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

app.post("/publish", (req, res) => {
  const { projectName, html, css, js, buynow, product, images } = req.body;

  // base attachments
  const attachments = [
    { filename: "index.html", content: html || "" },
    { filename: "style.css", content: css || "" },
    { filename: "script.js", content: js || "" }
  ];

  // optional html files
  if (buynow) {
    attachments.push({ filename: "buynow.html", content: buynow });
  }
  if (product) {
    attachments.push({ filename: "product.html", content: product });
  }

  // optional image files (expecting array of {name, data(base64)})
  if (images && Array.isArray(images)) {
    images.forEach(img => {
      attachments.push({
        filename: img.name,
        content: Buffer.from(img.data, "base64")
      });
    });
  }

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: `New Website Submission - ${projectName}`,
    text: "Website files are attached.",
    attachments
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      return res.status(500).send({ success: false, message: "Error sending email" });
    }
    res.send({ success: true, message: "Files sent to Gmail!" });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
