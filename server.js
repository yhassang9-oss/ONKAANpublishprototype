const express = require("express");
const nodemailer = require("nodemailer");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

const app = express();

// ✅ Serve static files (HTML, CSS, JS, images) directly from root
app.use(express.static(__dirname));

// ✅ Auto-serve any .html file if requested without extension
app.get("/:page", (req, res, next) => {
  const page = req.params.page + ".html";
  const filePath = path.join(__dirname, page);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    next();
  }
});

// ✅ Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ Templates route (send zipped templates by email)
app.get("/send-template", async (req, res) => {
  try {
    const zipPath = path.join(__dirname, "template.zip");

    // Create the zip file
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);

    // Add entire templates folder contents into the zip
    archive.directory(path.join(__dirname, "templates/"), false);

    // Finalize archive
    archive.finalize();

    output.on("close", async () => {
      try {
        // Setup email transporter
        let transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "yourgmail@gmail.com",       // replace with your gmail
            pass: "yourapppassword",           // replace with your app password
          },
        });

        // Email options
        let mailOptions = {
          from: "yourgmail@gmail.com",
          to: "receiver@gmail.com",            // replace with receiver
          subject: "Full Template",
          text: "Here are all the template files zipped.",
          attachments: [
            {
              filename: "template.zip",
              path: zipPath,
            },
          ],
        };

        // Send email
        await transporter.sendMail(mailOptions);
        res.send("Template sent successfully!");
      } catch (mailErr) {
        console.error("Email send error:", mailErr);
        res.status(500).send("Error sending email");
      }
    });

    output.on("error", (zipErr) => {
      console.error("Zip creation error:", zipErr);
      res.status(500).send("Error creating zip");
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).send("Error sending template");
  }
});

// ✅ Catch-all fallback → redirect to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
