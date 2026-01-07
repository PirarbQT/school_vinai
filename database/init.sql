/* ===============================
   DATABASE
================================ */
CREATE DATABASE school_score;
-- \c school_score;


/* ===============================
   MASTER TABLES
================================ */

/* ปีการศึกษา */
CREATE TABLE academic_years (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE
);

/* ภาคเรียน */
CREATE TABLE semesters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL
);

/* ระดับชั้น */
CREATE TABLE grades (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE
);

/* วิชา */
CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

/* ประเภทคะแนน (งาน, สอบ, เก็บคะแนน ฯลฯ) */
CREATE TABLE score_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);


/* ===============================
   ROOMS
================================ */
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  room_no INTEGER NOT NULL,
  UNIQUE (grade_id, room_no)
);


/* ===============================
   STUDENTS
================================ */
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(150) NOT NULL,
  grade_id INTEGER NOT NULL REFERENCES grades(id),
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
  UNIQUE (code, grade_id, room_id, academic_year_id)
);


/* ===============================
   SCORE ITEMS (งาน / สอบ)
   ✅ แก้ปัญหาซ้ำแล้ว
================================ */
CREATE TABLE score_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  max_score NUMERIC(5,2) NOT NULL,
  type_id INTEGER NOT NULL REFERENCES score_types(id),
  grade_id INTEGER NOT NULL REFERENCES grades(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
  semester_id INTEGER NOT NULL REFERENCES semesters(id),

  -- 🔥 สำคัญมาก
  UNIQUE (
    name,
    type_id,
    grade_id,
    subject_id,
    academic_year_id,
    semester_id
  )
);


/* ===============================
   SCORES (คะแนนนักเรียน)
================================ */
CREATE TABLE scores (
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score_item_id INTEGER NOT NULL REFERENCES score_items(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (student_id, score_item_id)
);


/* ===============================
   GRADE RANGES (ตัดเกรด A–F)
================================ */
CREATE TABLE grade_ranges (
  id SERIAL PRIMARY KEY,
  grade VARCHAR(5) NOT NULL,
  min_score NUMERIC(5,2) NOT NULL,

  grade_id INTEGER NOT NULL REFERENCES grades(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
  semester_id INTEGER NOT NULL REFERENCES semesters(id),

  -- 🔥 ป้องกันปัญหาเพิ่มได้แค่ชั้นเดียว
  UNIQUE (
    grade,
    subject_id,
    academic_year_id,
    semester_id,
    grade_id
  )
);


/* ===============================
   DEFAULT DATA (ตัวอย่าง)
================================ */

/* ภาคเรียน */
INSERT INTO semesters (name) VALUES
('1'), ('2');

/* ประเภทคะแนน */
INSERT INTO score_types (name) VALUES
('ชิ้นงาน'),
('สอบย่อย'),
('สอบกลางภาค'),
('สอบปลายภาค');

/* ตัวอย่างเกรด */
INSERT INTO grades (name) VALUES
('ป.1'), ('ป.2'), ('ป.3'),
('ม.1'), ('ม.2'), ('ม.3');

/* ตัวอย่างวิชา */
INSERT INTO subjects (name) VALUES
('คณิตศาสตร์'),
('ภาษาไทย'),
('วิทยาศาสตร์');

/* ตัวอย่างปี */
INSERT INTO academic_years (year) VALUES
(2566), (2567);
