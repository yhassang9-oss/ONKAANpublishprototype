const express = require("express");
const nodemailer = require("nodemailer");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();

// Parse JSON for API requests
app.use(bodyParser.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// In-memory session cache for temporary edits
let sessionCache = {}; 
// Example: { "homepage.html": "<html>edited content</html>" }

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "homepage.html"));
});

// --- Template route (iframe live preview) ---
app.get("/template/:filename", (req, res) => {
  const { filename } = req.params;

  // 1. Serve from session cache if exists
  if (sessionCache[filename]) {
    res.type("html").send(sessionCache[filename]);
    return;
  }

  // 2. Check in public folder
  let filePath = path.join(__dirname, "public", filename);

  // 3. Check in public/templates if not found
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, "public", "templates", filename);
  }

  // 4. Serve the file if exists
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

// Auto-serve any HTML page by name (with cache support)
app.get("/:page", (req, res, next) => {
  const filename = `${req.params.page}.html`;

  if (sessionCache[filename]) {
    res.type("html").send(sessionCache[filename]);
    return;
  }

  const filePath = path.join(__dirname, "public", filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    next();
  }
});

// Save edits temporarily in memory
app.post("/update", (req, res) => {
  const { filename, content } = req.body;
  if (filename && content) {
    sessionCache[filename] = content;
    res.sendStatus(200);
  } else {
    res.status(400).send("Missing filename or content");
  }
});

// Clear session cache
app.post("/reset", (req, res) => {
  sessionCache = {};
  res.sendStatus(200);
});

// Send zipped templates via email
app.get("/send-template", async (req, res) => {
  try {
    const zipPath = path.join(__dirname, "template.zip");

    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(path.join(__dirname, "public", "templates/"), false);
    archive.finalize();

    output.on("close", async () => {
      try {
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
              path: zipPath,
            },
          ],
        };

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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
