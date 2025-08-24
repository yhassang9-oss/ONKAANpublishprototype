const express = require("express");
const nodemailer = require("nodemailer");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

const app = express();

app.get("/send-template", async (req, res) => {
  try {
    const output = fs.createWriteStream("template.zip");
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);

    // Add the entire templates folder (all files inside)
    archive.directory(path.join(__dirname, "templates/"), false);

    await archive.finalize();

    output.on("close", async () => {
      // Send email with attachment
      let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "yourgmail@gmail.com",
          pass: "yourapppassword",
        },
      });

      let mailOptions = {
        from: "yourgmail@gmail.com",
        to: "receiver@gmail.com",
        subject: "Full Template",
        text: "Here are all the template files zipped.",
        attachments: [
          {
            filename: "template.zip",
            path: path.join(__dirname, "template.zip"),
          },
        ],
      };

      await transporter.sendMail(mailOptions);
      res.send("Template sent!");
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error sending email");
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
