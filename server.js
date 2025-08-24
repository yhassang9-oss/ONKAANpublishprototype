const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const fs = require("fs");
const archiver = require("archiver");
const path = require("path");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static("templates"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "index.html"));
});

app.post("/publish", (req, res) => {
  const { email } = req.body;

  // Create zip file path
  const output = fs.createWriteStream(path.join(__dirname, "template.zip"));
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);

  // Add entire folder "templates"
  archive.directory("templates/", false);

  archive.finalize();

  output.on("close", () => {
    // Setup mailer
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "your_email@gmail.com",
        pass: "your_app_password"
      }
    });

    let mailOptions = {
      from: "your_email@gmail.com",
      to: email,
      subject: "Your Website Files",
      text: "Here are your website template files in a ZIP.",
      attachments: [
        {
          filename: "template.zip",
          path: path.join(__dirname, "template.zip")
        }
      ]
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        res.send("Error sending email");
      } else {
        console.log("Email sent: " + info.response);
        res.send("Email sent successfully!");
      }
    });
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
