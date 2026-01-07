import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

/* ===== UTIL ===== */
const gradeOf = p => {
  p = Number(p);
  if (p >= 80) return 4;
  if (p >= 70) return 3;
  if (p >= 60) return 2;
  if (p >= 50) return 1;
  return 0;
};

/* ================= META ================= */
app.get("/api/meta", async (req, res) => {
  const [y, s, g, sub, st] = await Promise.all([
    pool.query("SELECT * FROM academic_years ORDER BY year DESC"),
    pool.query("SELECT * FROM semesters"),
    pool.query("SELECT * FROM grades"),
    pool.query("SELECT * FROM subjects"),
    pool.query("SELECT * FROM score_types")
  ]);
  res.json({ years: y.rows, semesters: s.rows, grades: g.rows, subjects: sub.rows, score_types: st.rows });
});

/* ================= ROOMS ================= */
/* list rooms */
app.get("/api/rooms", async (req, res) => {
  const r = await pool.query(
    "SELECT * FROM rooms WHERE grade_id=$1 ORDER BY room_no",
    [req.query.grade_id]
  );
  res.json(r.rows);
});

/* add room (ขั้นโปร) */
app.post("/api/rooms", async (req, res) => {
  const { grade_id, room_no } = req.body;
  if (!grade_id || !room_no) {
    return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
  }

  try {
    const r = await pool.query(
      "INSERT INTO rooms(grade_id, room_no) VALUES($1,$2) RETURNING *",
      [grade_id, room_no]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(400).json({ message: "ห้องนี้มีอยู่แล้ว" });
  }
});

/* ================= SCORE ITEMS ================= */
app.get("/api/score-items", async (req, res) => {
  const { grade_id, subject_id, academic_year_id, semester_id } = req.query;
  if (!grade_id || !subject_id || !academic_year_id || !semester_id) return res.json([]);

  const r = await pool.query(`
    SELECT si.*, st.name AS type_name
    FROM score_items si
    JOIN score_types st ON si.type_id = st.id
    WHERE si.grade_id=$1 AND si.subject_id=$2
      AND si.academic_year_id=$3 AND si.semester_id=$4
    ORDER BY st.id, si.id
  `, [grade_id, subject_id, academic_year_id, semester_id]);

  res.json(r.rows);
});

app.post("/api/score-items", async (req, res) => {
  const { name, max_score, type_id, grade_id, subject_id, academic_year_id, semester_id } = req.body;
  await pool.query(`
    INSERT INTO score_items
    (name,max_score,type_id,grade_id,subject_id,academic_year_id,semester_id)
    VALUES($1,$2,$3,$4,$5,$6,$7)
  `, [name, max_score, type_id, grade_id, subject_id, academic_year_id, semester_id]);
  res.sendStatus(201);
});

app.put("/api/score-items/:id", async (req, res) => {
  const { name, max_score, type_id } = req.body;
  await pool.query(
    "UPDATE score_items SET name=$1,max_score=$2,type_id=$3 WHERE id=$4",
    [name, max_score, type_id, req.params.id]
  );
  res.sendStatus(200);
});

app.delete("/api/score-items/:id", async (req, res) => {
  await pool.query("DELETE FROM score_items WHERE id=$1", [req.params.id]);
  res.sendStatus(204);
});

/* ================= STUDENTS ================= */
app.get("/api/students", async (req, res) => {
  const { grade_id, room_id, academic_year_id, subject_id, semester_id } = req.query;
  if (!grade_id || !room_id || !academic_year_id || !subject_id || !semester_id)
    return res.json([]);

  const students = await pool.query(`
    SELECT * FROM students
    WHERE grade_id=$1 AND room_id=$2 AND academic_year_id=$3
    ORDER BY code
  `, [grade_id, room_id, academic_year_id]);

  const items = await pool.query(`
    SELECT id, max_score
    FROM score_items
    WHERE grade_id=$1
      AND academic_year_id=$2
      AND subject_id=$3
      AND semester_id=$4
  `, [grade_id, academic_year_id, subject_id, semester_id]);

  const result = [];

  for (const s of students.rows) {
    const sc = await pool.query(
      "SELECT * FROM scores WHERE student_id=$1",
      [s.id]
    );

    const map = {};
    sc.rows.forEach(x => map[x.score_item_id] = x.score);

    let total = 0;
    let max = 0;

    items.rows.forEach(i => {
      total += Number(map[i.id] || 0);
      max += i.max_score;
    });

    const percent = max > 0 ? ((total / max) * 100).toFixed(1) : 0;

    result.push({
      ...s,
      scores: map,
      percent,
      grade: gradeOf(percent)
    });
  }

  res.json(result);
});


app.post("/api/students", async (req, res) => {
  const { code, name, grade_id, room_id, academic_year_id } = req.body;
  const r = await pool.query(`
    INSERT INTO students(code,name,grade_id,room_id,academic_year_id)
    VALUES($1,$2,$3,$4,$5) RETURNING *
  `, [code, name, grade_id, room_id, academic_year_id]);
  res.status(201).json(r.rows[0]);
});

app.put("/api/students/:id", async (req, res) => {
  const { code, name } = req.body;
  await pool.query(
    "UPDATE students SET code=$1,name=$2 WHERE id=$3",
    [code, name, req.params.id]
  );
  res.sendStatus(200);
});

app.delete("/api/students/:id", async (req, res) => {
  await pool.query("DELETE FROM students WHERE id=$1", [req.params.id]);
  res.sendStatus(204);
});

/* ================= SCORES ================= */
app.put("/api/scores", async (req, res) => {
  const { student_id, score_item_id, score } = req.body;
  await pool.query(`
    INSERT INTO scores(student_id,score_item_id,score)
    VALUES($1,$2,$3)
    ON CONFLICT (student_id,score_item_id)
    DO UPDATE SET score=$3
  `, [student_id, score_item_id, score]);
  res.sendStatus(200);
});

app.listen(3000, () => console.log("Backend ready → http://localhost:3000"));
