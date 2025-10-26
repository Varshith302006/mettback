const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { launchBrowser, login, fetchAcademic, fetchBiometric } = require("./fetchAttendance");

const app = express();

// --- CORS ---
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- Route: fetch attendance sequentially ---
app.post("/get-attendance", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, error: "Username and password required" });

  let browser, page;
  try {
    ({ browser, page } = await launchBrowser({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }));
    
    await login(page, username, password);

    // --- Step 1: Academic Attendance ---
    const academicWithTargets = await fetchAcademic(page);
    res.write(JSON.stringify({ step: "academic", data: academicWithTargets }) + "\n");

    // --- Step 2: Biometric Attendance ---
    const biometricAttendance = await fetchBiometric(page);
    res.write(JSON.stringify({ step: "biometric", data: biometricAttendance }) + "\n");

    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running ✅ on port ${PORT}`));
