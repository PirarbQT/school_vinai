import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

/* ===============================
   FIXED GRADES (A–F)
================================ */
const FIXED_GRADES = [
  "A",
  "B+",
  "B",
  "C+",
  "C",
  "D+",
  "D",
  "F"
];

/* ===============================
   META DATA
================================ */
app.get("/api/meta", async (req, res) => {
  const [years, semesters, grades, subjects, scoreTypes] = await Promise.all([
    pool.query("SELECT * FROM academic_years ORDER BY year DESC"),
    pool.query("SELECT * FROM semesters ORDER BY id"),
    pool.query("SELECT * FROM grades ORDER BY id"),
    pool.query("SELECT * FROM subjects ORDER BY name"),
    pool.query("SELECT * FROM score_types ORDER BY id")
  ]);

  res.json({
    years: years.rows,
    semesters: semesters.rows,
    grades: grades.rows,
    subjects: subjects.rows,
    score_types: scoreTypes.rows
  });
});

/* ===============================
   ROOMS
================================ */
app.get("/api/rooms", async (req, res) => {
  const { grade_id } = req.query;

  const r = await pool.query(
    "SELECT * FROM rooms WHERE grade_id=$1 ORDER BY room_no",
    [grade_id]
  );

  res.json(r.rows);
});

app.post("/api/rooms", async (req, res) => {
  const { grade_id, room_no } = req.body;

  const r = await pool.query(
    "INSERT INTO rooms (grade_id, room_no) VALUES ($1,$2) RETURNING *",
    [grade_id, room_no]
  );

  res.status(201).json(r.rows[0]);
});

/* ===============================
   STUDENTS
================================ */
app.get("/api/students", async (req, res) => {
  const {
    grade_id,
    room_id,
    subject_id,
    academic_year_id,
    semester_id
  } = req.query;

  if (!grade_id || !room_id || !academic_year_id) {
    return res.json([]);
  }

  const students = await pool.query(
    `SELECT * FROM students
     WHERE grade_id=$1 AND room_id=$2 AND academic_year_id=$3
     ORDER BY code`,
    [grade_id, room_id, academic_year_id]
  );

  const items = await pool.query(
    `SELECT id, max_score FROM score_items
     WHERE grade_id=$1 AND subject_id=$2
       AND academic_year_id=$3 AND semester_id=$4`,
    [grade_id, subject_id, academic_year_id, semester_id]
  );

  const result = [];

  for (const s of students.rows) {
    const sc = await pool.query(
      "SELECT * FROM scores WHERE student_id=$1",
      [s.id]
    );

    const scoreMap = {};
    sc.rows.forEach(x => scoreMap[x.score_item_id] = x.score);

    let total = 0;
    let max = 0;

    items.rows.forEach(i => {
      total += Number(scoreMap[i.id] || 0);
      max += Number(i.max_score || 0);
    });

    const percent = max
      ? Number(((total / max) * 100).toFixed(2))
      : 0;

    const grade = await gradeFromRange(
      percent,
      grade_id,
      subject_id,
      academic_year_id,
      semester_id
    );

    result.push({
      ...s,
      scores: scoreMap,
      percent,
      grade
    });
  }

  res.json(result);
});

app.post("/api/students", async (req, res) => {
  const { code, name, grade_id, room_id, academic_year_id } = req.body;

  if (!code || !name || !grade_id || !room_id || !academic_year_id) {
    return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
  }

  const r = await pool.query(
    `INSERT INTO students
     (code,name,grade_id,room_id,academic_year_id)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [code, name, grade_id, room_id, academic_year_id]
  );

  res.status(201).json(r.rows[0]);
});

app.delete("/api/students/:id", async (req, res) => {
  await pool.query(
    "DELETE FROM students WHERE id=$1",
    [req.params.id]
  );
  res.sendStatus(204);
});

/* ===============================
   SCORE ITEMS  ✅ แก้ตรงนี้
================================ */

/* GET */
app.get("/api/score-items", async (req, res) => {
  const { grade_id, subject_id, academic_year_id, semester_id } = req.query;

  const r = await pool.query(`
    SELECT si.*, st.name AS type_name
    FROM score_items si
    JOIN score_types st ON si.type_id = st.id
    WHERE grade_id=$1
      AND subject_id=$2
      AND academic_year_id=$3
      AND semester_id=$4
    ORDER BY st.id, si.id
  `, [grade_id, subject_id, academic_year_id, semester_id]);

  res.json(r.rows);
});

/* POST ➕ เพิ่มงาน */
app.post("/api/score-items", async (req, res) => {
  const {
    name,
    max_score,
    type_id,
    grade_id,
    subject_id,
    academic_year_id,
    semester_id
  } = req.body;

  if (
    !name ||
    max_score == null ||
    !type_id ||
    !grade_id ||
    !subject_id ||
    !academic_year_id ||
    !semester_id
  ) {
    return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
  }

  const r = await pool.query(`
    INSERT INTO score_items
    (name, max_score, type_id, grade_id, subject_id, academic_year_id, semester_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
  `, [
    name,
    max_score,
    type_id,
    grade_id,
    subject_id,
    academic_year_id,
    semester_id
  ]);

  res.status(201).json(r.rows[0]);
});

/* PUT ✏️ แก้ไขงาน */
app.put("/api/score-items/:id", async (req, res) => {
  const { id } = req.params;
  const { name, max_score, type_id } = req.body;

  if (!name || max_score == null || !type_id) {
    return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
  }

  await pool.query(`
    UPDATE score_items
    SET name=$1, max_score=$2, type_id=$3
    WHERE id=$4
  `, [name, max_score, type_id, id]);

  res.sendStatus(200);
});

/* DELETE 🗑 ลบงาน */
app.delete("/api/score-items/:id", async (req, res) => {
  const { id } = req.params;

  await pool.query(
    "DELETE FROM scores WHERE score_item_id=$1",
    [id]
  );

  await pool.query(
    "DELETE FROM score_items WHERE id=$1",
    [id]
  );

  res.sendStatus(204);
});

/* ===============================
   SCORES
================================ */
app.put("/api/scores", async (req, res) => {
  const { student_id, score_item_id, score } = req.body;

  await pool.query(`
    INSERT INTO scores(student_id, score_item_id, score)
    VALUES ($1,$2,$3)
    ON CONFLICT (student_id, score_item_id)
    DO UPDATE SET score=$3
  `, [student_id, score_item_id, score]);

  res.sendStatus(200);
});

/* ===============================
   GRADE RANGES
================================ */
app.get("/api/grade-ranges", async (req, res) => {
  const {
    grade_id,
    subject_id,
    academic_year_id,
    semester_id
  } = req.query;

  const r = await pool.query(`
    SELECT grade, min_score
    FROM grade_ranges
    WHERE grade_id=$1
      AND subject_id=$2
      AND academic_year_id=$3
      AND semester_id=$4
    ORDER BY min_score DESC
  `, [
    grade_id,
    subject_id,
    academic_year_id,
    semester_id
  ]);

  res.json(r.rows);
});

app.post("/api/grade-ranges", async (req, res) => {
  const {
    grade_id,
    subject_id,
    academic_year_id,
    semester_id,
    ranges
  } = req.body;

  if (!ranges || ranges.length !== FIXED_GRADES.length) {
    return res.status(400).json({
      message: "จำนวนช่วงคะแนนต้องครบ A–F"
    });
  }

  await pool.query(`
    DELETE FROM grade_ranges
    WHERE grade_id=$1
      AND subject_id=$2
      AND academic_year_id=$3
      AND semester_id=$4
  `, [grade_id, subject_id, academic_year_id, semester_id]);

  for (let i = 0; i < FIXED_GRADES.length; i++) {
    await pool.query(`
      INSERT INTO grade_ranges
      (grade, min_score, grade_id, subject_id, academic_year_id, semester_id)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [
      FIXED_GRADES[i],
      Number(ranges[i].min_score || 0),
      grade_id,
      subject_id,
      academic_year_id,
      semester_id
    ]);
  }

  res.sendStatus(200);
});

/* ===============================
   GRADE CALCULATION
================================ */
async function gradeFromRange(
  percent,
  grade_id,
  subject_id,
  academic_year_id,
  semester_id
){
  const r = await pool.query(`
    SELECT grade FROM grade_ranges
    WHERE grade_id=$1
      AND subject_id=$2
      AND academic_year_id=$3
      AND semester_id=$4
      AND min_score <= $5
    ORDER BY min_score DESC
    LIMIT 1
  `, [
    grade_id,
    subject_id,
    academic_year_id,
    semester_id,
    percent
  ]);

  return r.rows[0]?.grade || "F";
}

/* ===============================
   SERVER
================================ */
app.listen(3000, () => {
  console.log("🚀 Backend running at http://localhost:3000");
});
