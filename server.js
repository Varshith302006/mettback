const { Cluster } = require('puppeteer-cluster');
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
// Only import these 3 from fetchAttendance.js (not launchBrowser)
const { login, fetchAcademic, fetchBiometric } = require("./fetchAttendance");

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let cluster;

(async () => {
  cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 5,
    puppeteerOptions: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    }
  });

  // Cluster task
  cluster.task(async ({ page, data }) => {
    const { username, password } = data;
    await login(page, username, password);
    const academicWithTargets = await fetchAcademic(page);
    const biometricAttendance = await fetchBiometric(page);

    return {
      success: true,
      steps: [
        { step: "academic", data: academicWithTargets },
        { step: "biometric", data: biometricAttendance }
      ]
    };
  });

  // --- Route: get-attendance ---
  app.post("/get-attendance", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, error: "Username and password required" });

    try {
      const result = await cluster.execute({ username, password });
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Start server ---
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running ✅ on port ${PORT}`));
})();
