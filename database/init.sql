CREATE DATABASE school_db;

CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  class VARCHAR(10) NOT NULL
);

CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  max_score INT NOT NULL,
  class VARCHAR(10) NOT NULL
);

CREATE TABLE scores (
  student_id INT NOT NULL,
  assignment_id INT NOT NULL,
  score INT DEFAULT 0,

  PRIMARY KEY (student_id, assignment_id),

  CONSTRAINT fk_student
    FOREIGN KEY (student_id)
    REFERENCES students(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_assignment
    FOREIGN KEY (assignment_id)
    REFERENCES assignments(id)
    ON DELETE CASCADE
);
