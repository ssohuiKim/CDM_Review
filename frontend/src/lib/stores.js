// import { writable } from 'svelte/store';

// export const parsedData = writable([]);
// export const patientNos = writable([]);
// export const subs = writable([]);
// export const indexDates = writable([]);
// export const followEnds = writable([]);
// export const indexLastdates = writable([]);
// export const visitLastDays = writable([]);
// export const drugExposureStartDates = writable([]);
// export const drugConceptIds = writable([]);
// export const drugNames = writable([]);
// export const drugNameDoses = writable([]);
// export const measurementDates = writable([]);
// export const grades = writable([]);
// export const groupedPatientData = writable({});

import { writable } from 'svelte/store';

// DuckDB 관련 코드는 서버 측 코드에서만 사용
if (typeof window === 'undefined') {
    const DuckDB = require('duckdb');
    
    // Create a new DuckDB instance
    const db = new DuckDB();
  
  db.connect().then(() => {
    db.query(`
      CREATE TABLE parsedData (
        id INTEGER,
        data TEXT
      )
    `);
    db.query(`
      CREATE TABLE patientNos (
        id INTEGER,
        patientNo TEXT
      )
    `);
    db.query(`
      CREATE TABLE subs (
        id INTEGER,
        sub TEXT
      )
    `);
    db.query(`
      CREATE TABLE indexDates (
        id INTEGER,
        indexDate TEXT
      )
    `);
    db.query(`
      CREATE TABLE followEnds (
        id INTEGER,
        followEnd TEXT
      )
    `);
    db.query(`
      CREATE TABLE indexLastdates (
        id INTEGER,
        indexLastdate TEXT
      )
    `);
    db.query(`
      CREATE TABLE visitLastDays (
        id INTEGER,
        visitLastDay TEXT
      )
    `);
    db.query(`
      CREATE TABLE drugExposureStartDates (
        id INTEGER,
        drugExposureStartDate TEXT
      )
    `);
    db.query(`
      CREATE TABLE drugConceptIds (
        id INTEGER,
        drugConceptId TEXT
      )
    `);
    db.query(`
      CREATE TABLE drugNames (
        id INTEGER,
        drugName TEXT
      )
    `);
    db.query(`
      CREATE TABLE drugNameDoses (
        id INTEGER,
        drugNameDose TEXT
      )
    `);
    db.query(`
      CREATE TABLE measurementDates (
        id INTEGER,
        measurementDate TEXT
      )
    `);
    db.query(`
      CREATE TABLE grades (
        id INTEGER,
        grade TEXT
      )
    `);
    db.query(`
      CREATE TABLE groupedPatientData (
        id INTEGER,
        data TEXT
      )
    `);
  });
}

// Svelte 스토어 정의
export const parsedData = writable([]);
export const patientNos = writable([]);
export const subs = writable([]);
export const indexDates = writable([]);
export const followEnds = writable([]);
export const indexLastdates = writable([]);
export const visitLastDays = writable([]);
export const drugExposureStartDates = writable([]);
export const drugConceptIds = writable([]);
export const drugNames = writable([]);
export const drugNameDoses = writable([]);
export const measurementDates = writable([]);
export const grades = writable([]);
export const groupedPatientData = writable({});
