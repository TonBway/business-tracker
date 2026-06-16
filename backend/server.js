const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// SQLite DB stored in a named volume at /data
const db = new Database(path.join("/data", "tracker.db"));

// Init schema
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id          TEXT PRIMARY KEY,
    date        TEXT NOT NULL,
    type        TEXT NOT NULL CHECK(type IN ('income','expense')),
    category    TEXT NOT NULL,
    description TEXT NOT NULL,
    amount      REAL NOT NULL CHECK(amount > 0),
    created_at  TEXT DEFAULT (datetime('now'))
  );
`);

// Seed sample data if empty
// const count = db.prepare("SELECT COUNT(*) as c FROM transactions").get();
// if (count.c === 0) {
//   const insert = db.prepare("INSERT INTO transactions (id,date,type,category,description,amount) VALUES (?,?,?,?,?,?)");
//   const seed = [
//     ["1","2026-05-02","income","Services","Web design project",4800],
//     ["2","2026-05-10","income","Consulting","Strategy workshop",2200],
//     ["3","2026-05-14","expense","Salaries","May payroll",3100],
//     ["4","2026-05-18","expense","Software","SaaS subscriptions",340],
//     ["5","2026-05-22","income","Sales","Product batch #7",1650],
//     ["6","2026-05-28","expense","Marketing","Social media ads",600],
//     ["7","2026-06-03","income","Consulting","Advisory retainer",3000],
//     ["8","2026-06-07","expense","Rent","Office — June",1200],
//     ["9","2026-06-09","expense","Utilities","Internet & electricity",210],
//     ["10","2026-06-12","income","Services","Maintenance contract",900],
//   ];
//   seed.forEach(row => insert.run(...row));
// }

// GET all transactions (newest first)
app.get("/api/transactions", (req, res) => {
  const rows = db.prepare("SELECT * FROM transactions ORDER BY date DESC, created_at DESC").all();
  res.json(rows);
});

// POST new transaction
app.post("/api/transactions", (req, res) => {
  const { id, date, type, category, description, amount } = req.body;
  if (!id || !date || !type || !category || !description || !amount) {
    return res.status(400).json({ error: "All fields required" });
  }
  try {
    db.prepare("INSERT INTO transactions (id,date,type,category,description,amount) VALUES (?,?,?,?,?,?)")
      .run(id, date, type, category, description, parseFloat(amount));
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE a transaction
app.delete("/api/transactions/:id", (req, res) => {
  db.prepare("DELETE FROM transactions WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Health check
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
