const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));

// --- Gmail transporter setup ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "yachanghassang93@gmail.com",      // <-- your Gmail address
    pass: "kcuvhikkjikdqtug"        // <-- replace this with Gmail App Password
  }
});

app.post("/publish", (req, res) => {
  const { projectName, html, css, js } = req.body;

  const mailOptions = {
    from: "yachanghassang93@gmail.com",
    to: "yachanghassang93@gmail.com",   // <-- email to receive website files
    subject: `New Website Submission - ${projectName}`,
    text: "Website files are attached.",
    attachments: [
      { filename: "index.html", content: html },
      { filename: "style.css", content: css },
      { filename: "script.js", content: js }
    ]
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      return res.status(500).send({ success: false, message: "Error sending email" });
    }
    res.send({ success: true, message: "Files sent to Gmail!" });
  });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
