/* ==============================
   DATABASE
============================== */
CREATE DATABASE school_db;
-- \c school_db;

/* ==============================
   MASTER TABLES
============================== */

CREATE TABLE academic_years (
  id SERIAL PRIMARY KEY,
  year INT NOT NULL
);

INSERT INTO academic_years(year) VALUES (2566),(2567),(2568);

CREATE TABLE semesters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(10) NOT NULL
);

INSERT INTO semesters(name) VALUES ('1'),('2');

CREATE TABLE grades (
  id SERIAL PRIMARY KEY,
  name VARCHAR(10) NOT NULL
);

INSERT INTO grades(name) VALUES
('ป.1'),('ป.2'),('ป.3'),('ป.4'),('ป.5'),('ป.6'),
('ม.1'),('ม.2'),('ม.3'),('ม.4'),('ม.5'),('ม.6');

CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

INSERT INTO subjects(name) VALUES
('คณิตศาสตร์'),
('ภาษาไทย'),
('วิทยาศาสตร์'),
('สังคมศึกษา'),
('ภาษาอังกฤษ');

/* ==============================
   ROOMS
============================== */
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  grade_id INT REFERENCES grades(id) ON DELETE CASCADE,
  room_no INT NOT NULL,
  UNIQUE (grade_id, room_no)
);

/* ==============================
   STUDENTS
============================== */
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  grade_id INT REFERENCES grades(id),
  room_id INT REFERENCES rooms(id),
  academic_year_id INT REFERENCES academic_years(id)
);

/* ==============================
   SCORE STRUCTURE
============================== */

CREATE TABLE score_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);

INSERT INTO score_types(name) VALUES
('ชิ้นงาน'),
('ใบงาน'),
('สอบกลางภาค'),
('สอบปลายภาค');

CREATE TABLE score_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  max_score INT NOT NULL,
  type_id INT REFERENCES score_types(id),
  grade_id INT REFERENCES grades(id),
  subject_id INT REFERENCES subjects(id),
  academic_year_id INT REFERENCES academic_years(id),
  semester_id INT REFERENCES semesters(id)
);

/* ==============================
   SCORES
============================== */
CREATE TABLE scores (
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  score_item_id INT REFERENCES score_items(id) ON DELETE CASCADE,
  score INT DEFAULT 0,
  PRIMARY KEY(student_id, score_item_id)
);

/* ==============================
   SAMPLE DATA (OPTIONAL)
============================== */

/* ตัวอย่างห้อง */
INSERT INTO rooms(grade_id,room_no) VALUES
(1,1),(1,2),(1,3),
(7,1),(7,2);

/* ตัวอย่างนักเรียน */
INSERT INTO students(code,name,grade_id,room_id,academic_year_id) VALUES
('1','เด็กชายตัวอย่าง ดี',1,1,2),
('2','เด็กหญิงตัวอย่าง ดี',1,1,2);

/* ตัวอย่างโครงคะแนน */
INSERT INTO score_items
(name,max_score,type_id,grade_id,subject_id,academic_year_id,semester_id)
VALUES
('งาน 1',20,1,1,1,2,1),
('สอบกลางภาค',20,3,1,1,2,1),
('สอบปลายภาค',60,4,1,1,2,1);
