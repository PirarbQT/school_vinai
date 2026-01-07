import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend OK - School Score System");
});

/* =================== UTIL =================== */
const gradeOf = (p)=>{
  p = Number(p);
  if(p>=80) return 'A';
  if(p>=70) return 'B';
  if(p>=60) return 'C';
  if(p>=50) return 'D';
  return 'F';
};

/* =================== STUDENTS =================== */
/* ดึงนักเรียนตามชั้น */
app.get("/api/students", async(req,res)=>{
  const className = req.query.class || 'ป.1';

  const students = await pool.query(
    "SELECT * FROM students WHERE class=$1 ORDER BY id",
    [className]
  );

  const assignments = await pool.query(
    "SELECT * FROM assignments WHERE class=$1 ORDER BY id",
    [className]
  );

  const result = [];

  for (const s of students.rows){
    const scores = await pool.query(
      `SELECT a.id, a.name, a.max_score, COALESCE(sc.score,0) AS score
       FROM assignments a
       LEFT JOIN scores sc
       ON a.id=sc.assignment_id AND sc.student_id=$1
       WHERE a.class=$2`,
      [s.id, className]
    );

    const total = scores.rows.reduce((sum,x)=>sum+Number(x.score),0);
    const max = scores.rows.reduce((sum,x)=>sum+Number(x.max_score),0);
    const percent = max===0 ? 0 : ((total/max)*100).toFixed(1);

    result.push({
      ...s,
      scores: scores.rows,
      percent,
      grade: gradeOf(percent)
    });
  }

  res.json(result);
});

/* เพิ่มนักเรียน */
app.post("/api/students", async(req,res)=>{
  const { code, name, className } = req.body;

  await pool.query(
    "INSERT INTO students(code,name,class) VALUES($1,$2,$3)",
    [code, name, className]
  );

  res.sendStatus(201);
});

/* ลบนักเรียน */
app.delete("/api/students/:id", async(req,res)=>{
  await pool.query("DELETE FROM students WHERE id=$1",[req.params.id]);
  res.sendStatus(204);
});

/* =================== ASSIGNMENTS =================== */
/* ดึงงาน */
app.get("/api/assignments", async(req,res)=>{
  const className = req.query.class || 'ป.1';
  const r = await pool.query(
    "SELECT * FROM assignments WHERE class=$1 ORDER BY id",
    [className]
  );
  res.json(r.rows);
});

/* เพิ่มงาน */
app.post("/api/assignments", async(req,res)=>{
  const { name, max_score, className } = req.body;

  await pool.query(
    "INSERT INTO assignments(name,max_score,class) VALUES($1,$2,$3)",
    [name,max_score,className]
  );

  res.sendStatus(201);
});

/* ลบงาน */
app.delete("/api/assignments/:id", async(req,res)=>{
  await pool.query(
    "DELETE FROM assignments WHERE id=$1",
    [req.params.id]
  );
  res.sendStatus(204);
});

/* =================== SCORES =================== */
/* บันทึกคะแนน */
app.put("/api/scores", async(req,res)=>{
  const { student_id, assignment_id, score } = req.body;

  await pool.query(`
    INSERT INTO scores(student_id,assignment_id,score)
    VALUES($1,$2,$3)
    ON CONFLICT (student_id,assignment_id)
    DO UPDATE SET score=$3
  `,[student_id,assignment_id,score]);

  res.sendStatus(200);
});

/* =================== SERVER =================== */
app.listen(3000,()=>console.log("Backend running :3000"));
