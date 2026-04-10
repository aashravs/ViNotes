const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/log", (req, res) => {
  const { email, data } = req.body;

  if (!email || !data) {
    return res.status(400).send("Missing email or data");
  }

  const safeEmail = email.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `logs_user_${safeEmail}.txt`;

  const log = `
====================
Time: ${new Date().toISOString()}
${JSON.stringify(data, null, 2)}
====================
`;

  fs.appendFile(fileName, log, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error, creating or writing to file failed");
    }
    res.send("Saved");
  });
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});