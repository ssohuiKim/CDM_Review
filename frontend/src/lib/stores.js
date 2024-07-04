import { writable } from 'svelte/store';

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

// import { writable } from 'svelte/store';
// import * as duckdb from '@duckdb/duckdb-wasm';
// import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
// import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
// import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
// import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

// export const parsedData = writable([]);
// export const groupedPatientData = writable({});

// // Function to initialize DuckDB-WASM
// export async function initializeDuckDB() {
//   try {
//     const localBundles = {
//       mvp: {
//         mainModule: duckdb_wasm,
//         mainWorker: mvp_worker
//       },
//       eh: {
//         mainModule: duckdb_wasm_eh,
//         mainWorker: eh_worker,
//       },
//     };

//     const bundle = await duckdb.selectBundle(localBundles);
//     const worker = new Worker(bundle.mainWorker);
//     const logger = new duckdb.ConsoleLogger();
//     const db = new duckdb.AsyncDuckDB(logger, worker);
//     await db.instantiate(bundle.mainModule, bundle.mainWorker);
//     console.log('DuckDB initialized successfully');
//     return db;
//   } catch (error) {
//     console.error('Error initializing DuckDB:', error);
//     throw error;
//   }
// }

// // Function to load CSV data into DuckDB-WASM
// export async function loadCSVToDuckDB(duckDbInstance, csvContent) {
//   const conn = await duckDbInstance.connect();

//   try {
//     console.log('CSV Content:', csvContent);

//     if (typeof csvContent !== 'string' || csvContent.trim() === '') {
//       throw new Error('Invalid CSV content');
//     }

//     await conn.query(`CREATE TABLE data (
//       patient_no INTEGER,
//       sub INTEGER,
//       index_date DATE,
//       follow_end DATE,
//       index_lastdate DATE,
//       visit_lastday DATE,
//       drug_exposure_start_date DATE,
//       drug_concept_id INTEGER,
//       drug_name TEXT,
//       drug_name_dose TEXT,
//       measurement_date DATE,
//       grade INTEGER
//     )`);
//     console.log('Table created successfully');

//     await conn.query(`COPY data FROM 'data:text/csv;base64,${btoa(csvContent)}' (HEADER, DELIMITER ',')`);
//     const result = await conn.query('SELECT * FROM data');
//     parsedData.set(result.toArray());
//     console.log('CSV data queried successfully');
//   } catch (error) {
//     console.error('Error loading CSV data into DuckDB:', error);
//     throw error;
//   } finally {
//     await conn.close();
//   }
// }



// import { writable } from 'svelte/store';
// import * as duckdb from '@duckdb/duckdb-wasm';
// import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
// import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
// import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
// import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

// export const parsedData = writable([]);
// export const groupedPatientData = writable({});

// export async function initializeDuckDB() {
//   try {
//     // console.log('Initializing DuckDB...');
//     const localBundles = {
//       mvp: {
//         mainModule: duckdb_wasm,
//         mainWorker: mvp_worker
//       },
//       eh: {
//         mainModule: duckdb_wasm_eh,
//         mainWorker: eh_worker,
//       },
//     };

//     // console.log('Selecting DuckDB bundle...');
//     const bundle = await duckdb.selectBundle(localBundles);
//     // console.log('Selected bundle:', bundle);

//     const worker = new Worker(bundle.mainWorker);
//     // const logger = new duckdb.ConsoleLogger();
//     const customLogger = {
//       log: () => {},
//       info: () => {},
//       warn: () => {},
//       error: () => {},
//     };
//     const db = new duckdb.AsyncDuckDB(customLogger, worker);

//     // console.log('Instantiating DuckDB...');
//     await db.instantiate(bundle.mainModule, bundle.mainWorker);
//     // console.log('DuckDB initialized successfully');
//     return db;
//   } catch (error) {
//     // console.error('Error initializing DuckDB:', error);
//     throw error;
//   }
// }

// function convertDate(dateStr) {
//   if (dateStr === '') return 'NULL';
//   const parts = dateStr.split('-');
//   if (parts.length !== 3) return 'NULL';
//   const [yy, mm, dd] = parts;
//   return `'20${yy.padStart(2, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}'`;
// }

// function convertValue(value, header) {
//   if (value === '') return 'NULL';
//   if (header.includes('_date')) {
//     return convertDate(value);
//   }
//   return `'${value.replace(/'/g, "''")}'`;
// }

// export async function loadCSVToDuckDB(duckDbInstance, csvContent) {
//   const conn = await duckDbInstance.connect();

//   try {
//     // console.log('Loading CSV data into DuckDB...');
//     if (typeof csvContent !== 'string' || csvContent.trim() === '') {
//       throw new Error('Invalid CSV content');
//     }

//     // console.log('Creating table in DuckDB...');
//     await conn.query(`CREATE TABLE data (
//       patient_no INTEGER,
//       sub INTEGER,
//       index_date TEXT,
//       follow_end TEXT,
//       index_lastdate TEXT,
//       visit_last_Day TEXT,
//       drug_exposure_start_date TEXT,
//       drug_concept_id INTEGER,
//       drug_name TEXT,
//       drug_name_dose TEXT,
//       measurement_date TEXT,
//       grade INTEGER
//     )`);
//     // console.log('Table created successfully');

//     // console.log('Inserting data into DuckDB...');
//     const lines = csvContent.split('\n');
//     const headers = lines[0].split(',');
//     for (let i = 1; i < lines.length; i++) {
//       const values = lines[i].split(',').map(value => value.trim());
//       if (values.length === headers.length) {
//         const query = `INSERT INTO data (${headers.join(',')}) VALUES (${values.map((value, index) => convertValue(value, headers[index])).join(',')})`;
//         // console.log('Executing query:', query);
//         await conn.query(query);
//       } else {
//         // console.warn(`Skipping line ${i + 1} due to mismatch in column count:`, lines[i]);
//       }
//     }
//     // console.log('Data inserted successfully');

//     // console.log('Querying data from DuckDB...');
//     const result = await conn.query('SELECT * FROM data');
//     const resultArray = result.toArray();
//     parsedData.set(resultArray);
//     // console.log('parsedData set:', resultArray);

//     const groupedResult = await conn.query('SELECT patient_no, sub, index_date, follow_end, index_lastdate, visit_last_Day, drug_exposure_start_date, drug_concept_id, drug_name, drug_name_dose, measurement_date, grade FROM data');
//     const groupedData = groupedResult.toArray().reduce((acc, row) => {
//       const patientNo = row.patient_no;
//       if (!acc[patientNo]) {
//         acc[patientNo] = [];
//       }
//       acc[patientNo].push(row);
//       return acc;
//     }, {});
//     groupedPatientData.set(groupedData);
//     // console.log('groupedPatientData set:', groupedData);

//     // console.log('CSV data queried and grouped successfully');
//   } catch (error) {
//     // console.error('Error loading CSV data into DuckDB:', error);
//     throw error;
//   } finally {
//     await conn.close();
//   }
// }

// export async function handleCSVUpload(file) {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();

//     reader.onload = async (event) => {
//       try {
//         // console.log('Reading CSV file...');
//         const csvContent = event.target.result;
//         // console.log('CSV Content:', csvContent);
//         const duckDbInstance = await initializeDuckDB();
//         await loadCSVToDuckDB(duckDbInstance, csvContent);
//         resolve();
//       } catch (error) {
//         // console.error('Error in handleCSVUpload:', error);
//         reject(error);
//       }
//     };
//     reader.onerror = (event) => {
//       // console.error('Error reading CSV file:', event);
//       reject(reader.error);
//     };

//     reader.readAsText(file);
//   });
// }
