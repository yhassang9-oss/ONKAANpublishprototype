const express = require("express");
const nodemailer = require("nodemailer");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();

// ✅ Parse JSON for API requests
app.use(bodyParser.json());

// ✅ Serve static files (HTML, CSS, JS, images) from /public
app.use(express.static(path.join(__dirname, "public")));

// ✅ In-memory cache for session edits
let sessionCache = {}; 
// Example: { "homepage.html": "<html>edited</html>" }

// ✅ Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- ✅ Template route (for iframe live preview) ---
app.get("/template/:filename", (req, res) => {
  const { filename } = req.params;

  // 1️⃣ Check session cache first
  if (sessionCache[filename]) {
    res.type("html").send(sessionCache[filename]);
    return;
  }

  // 2️⃣ Check in /public
  let filePath = path.join(__dirname, "public", filename);

  // 3️⃣ If not found, check in /public/templates
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, "public", "templates", filename);
  }

  // 4️⃣ Serve file if exists
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

// ✅ Auto-serve any HTML file (with session cache support)
app.get("/:page", (req, res, next) => {
  const filename = `${req.params.page}.html`;

  // if we have a cached edit → send that
  if (sessionCache[filename]) {
    res.type("html").send(sessionCache[filename]);
    return;
  }

  // else, serve from /public
  const filePath = path.join(__dirname, "public", filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    next(); // move on if file doesn’t exist
  }
});

// ✅ Save edits temporarily in memory (session cache)
app.post("/update", (req, res) => {
  const { filename, content } = req.body;
  sessionCache[filename] = content;
  res.sendStatus(200);
});

// ✅ Clear session (for Cancel workflow later)
app.post("/reset", (req, res) => {
  sessionCache = {};
  res.sendStatus(200);
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
    archive.directory(path.join(__dirname, "public", "templates/"), false);

    // Finalize archive
    archive.finalize();

    output.on("close", async () => {
      try {
        // Setup email transporter
        let transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "yourgmail@gmail.com", // replace with your gmail
            pass: "yourapppassword",     // replace with your app password
          },
        });

        // Email options
        let mailOptions = {
          from: "yourgmail@gmail.com",
          to: "receiver@gmail.com",     // replace with receiver
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
