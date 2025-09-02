const express = require("express");
const nodemailer = require("nodemailer");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise"); // ✅ MySQL/TiDB client

const app = express();
app.use(bodyParser.json());

// ✅ TiDB connection pool (hardcoded credentials)
const pool = mysql.createPool({
  host: "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
  user: "447nUVsKV65EbfX.root",
  password: "G0kLRZOBzXFU9F4l", // ⚠️ replace with your real password
  database: "cluster1",
  port: 4000,
  ssl: {
    ca: fs.readFileSync("./ca.pem"), // ⚠️ Download this from TiDB Cloud console
  },
});

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// Home route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "homepage.html"));
});

// --- Template route (iframe live preview) ---
app.get("/template/:filename", async (req, res) => {
  const { filename } = req.params;

  try {
    // 1. Look for cached version in DB
    const [rows] = await pool.query(
      "SELECT content FROM pages WHERE filename = ? LIMIT 1",
      [filename]
    );
    if (rows.length > 0) {
      res.type("html").send(rows[0].content);
      return;
    }

    // 2. Look in /public
    let filePath = path.join(__dirname, "public", filename);

    // 3. Look in /public/templates if not found
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, "public", "templates", filename);
    }

    // 4. Serve file if exists
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send("File not found");
    }
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).send("Database error");
  }
});

// Auto-serve any HTML page by name (with DB support)
app.get("/:page", async (req, res, next) => {
  const filename = `${req.params.page}.html`;

  try {
    const [rows] = await pool.query(
      "SELECT content FROM pages WHERE filename = ? LIMIT 1",
      [filename]
    );
    if (rows.length > 0) {
      res.type("html").send(rows[0].content);
      return;
    }

    const filePath = path.join(__dirname, "public", filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      next();
    }
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).send("Database error");
  }
});

// ✅ Save edits permanently in DB
app.post("/update", async (req, res) => {
  const { filename, content } = req.body;
  if (!filename || !content) {
    return res.status(400).send("Missing filename or content");
  }

  try {
    await pool.query(
      "INSERT INTO pages (filename, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)",
      [filename, content]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).send("Error saving file");
  }
});

// ✅ Reset pages (clear DB)
app.post("/reset", async (req, res) => {
  try {
    await pool.query("DELETE FROM pages");
    res.sendStatus(200);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).send("Error resetting pages");
  }
});

// ✅ Send zipped templates via email
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
          attachments: [{ filename: "template.zip", path: zipPath }],
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
