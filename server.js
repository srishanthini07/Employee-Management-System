require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME || "employee_management",
  waitForConnections: true,
  connectionLimit: 10,
});

// Startup check
pool
  .getConnection()
  .then((conn) => {
    console.log("DATABASE CONNECTED as", process.env.DB_USER || "root");
    conn.release();
  })
  .catch((err) => console.log("DATABASE ERROR:", err.code, "-", err.message));

app.get("/", (req, res) => res.send("Employee Management API is running!"));

// READ
app.get("/api/employees", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM employees ORDER BY EmployeeID DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE
app.post("/api/employees", async (req, res) => {
  const { EmployeeName, Email, Department, Designation, Salary, JoiningDate } =
    req.body;

  if (!EmployeeName || !Email || Salary === undefined || Salary === "") {
    return res
      .status(400)
      .json({ error: "EmployeeName, Email and Salary are required" });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO employees (EmployeeName, Email, Department, Designation, Salary, JoiningDate)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        EmployeeName.trim(),
        Email.trim(),
        Department || null,
        Designation || null,
        Number(Salary),
        JoiningDate || null,
      ]
    );
    res.status(201).json({
      EmployeeID: result.insertId,
      EmployeeName: EmployeeName.trim(),
      Email: Email.trim(),
      Department: Department || null,
      Designation: Designation || null,
      Salary: Number(Salary),
      JoiningDate: JoiningDate || null,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
app.put("/api/employees/:id", async (req, res) => {
  const { EmployeeName, Email, Department, Designation, Salary, JoiningDate } =
    req.body;

  if (!EmployeeName || !Email || Salary === undefined || Salary === "") {
    return res
      .status(400)
      .json({ error: "EmployeeName, Email and Salary are required" });
  }

  try {
    const [result] = await pool.query(
      `UPDATE employees
       SET EmployeeName = ?, Email = ?, Department = ?, Designation = ?, Salary = ?, JoiningDate = ?
       WHERE EmployeeID = ?`,
      [
        EmployeeName.trim(),
        Email.trim(),
        Department || null,
        Designation || null,
        Number(Salary),
        JoiningDate || null,
        req.params.id,
      ]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ EmployeeID: Number(req.params.id) });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE
app.delete("/api/employees/:id", async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM employees WHERE EmployeeID = ?",
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ message: "Deleted", EmployeeID: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
