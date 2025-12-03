import { writable } from 'svelte/store';
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import { saveToIndexedDB, loadFromIndexedDB, clearIndexedDB } from './indexedDB';

// IndexedDB keys for DuckDB database backup
const INDEXEDDB_KEY_DUCKDB = 'duckdb_backup';

// Svelte stores (now only for derived/cached data)
export const parsedData = writable([]);
export const groupedPatientData = writable({});

// Store for toxic/safe drug classification (shared between DrugChart and Survey)
export const drugClassification = writable({
    toxic: [],      // toxic drug ingredient names
    toxicIds: [],   // toxic drug concept IDs
    safe: [],       // safe drug names
    safeIds: []     // safe drug concept IDs
});

// Store for chart-computed data (shared between DrugChart and Survey)
// This avoids duplicate calculations and speeds up AI analysis
export const chartComputedData = writable({
    totalDays: 0,
    firstDate: null,
    lastDate: null,
    iciExposurePeriods: {},  // { drugName: [{ start, end, startDate, endDate }] }
    gradeChanges: [],        // [{ day, grade }]
    iciDrugs: [],            // List of ICI drugs for this patient
    diagnosisGroup: ''
});

// Global DuckDB instance and connection
let globalDB = null;
let globalConnection = null;

// Clear data from IndexedDB
export async function clearDataFromIndexedDB() {
  try {
    await clearIndexedDB();
    parsedData.set([]);
    groupedPatientData.set({});

    // Reset global DB
    if (globalConnection) {
      await globalConnection.close();
      globalConnection = null;
    }
    globalDB = null;

    console.log('✅ Data cleared from IndexedDB');
  } catch (error) {
    console.error('❌ Error clearing data from IndexedDB:', error);
  }
}

// Function to initialize DuckDB-WASM (creates new instance)
async function createDuckDBInstance() {
  const localBundles = {
    mvp: {
      mainModule: duckdb_wasm,
      mainWorker: mvp_worker
    },
    eh: {
      mainModule: duckdb_wasm_eh,
      mainWorker: eh_worker,
    },
  };

  const bundle = await duckdb.selectBundle(localBundles);
  const worker = new Worker(bundle.mainWorker);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.mainWorker);
  return db;
}

// Initialize or restore DuckDB from IndexedDB backup
export async function initializeDuckDB() {
  try {
    // If already initialized, return existing instance
    if (globalDB) {
      console.log('✅ Using existing DuckDB instance');
      return { db: globalDB, connection: globalConnection };
    }

    // Try to restore from IndexedDB backup
    const backup = await loadFromIndexedDB(INDEXEDDB_KEY_DUCKDB);

    globalDB = await createDuckDBInstance();
    globalConnection = await globalDB.connect();

    if (backup) {
      console.log('📦 Restoring DuckDB from IndexedDB backup...');

      // Register the Parquet backup file
      await globalDB.registerFileBuffer('backup.parquet', new Uint8Array(backup));

      // Create patients table from Parquet file
      try {
        await globalConnection.query("CREATE TABLE patients AS SELECT * FROM 'backup.parquet'");
        console.log('✅ DuckDB restored from backup');
      } catch (error) {
        // If restore fails, log warning but continue (table will be created on next upload)
        console.warn('⚠️ Failed to restore from backup (this is normal on first use):', error);
      }
    } else {
      console.log('🆕 Creating new DuckDB instance (no backup found)');
    }

    return { db: globalDB, connection: globalConnection };
  } catch (error) {
    console.error('❌ Error initializing DuckDB:', error);
    throw error;
  }
}

// Export DuckDB to IndexedDB
export async function exportDuckDBToIndexedDB() {
  try {
    if (!globalDB || !globalConnection) {
      console.warn('⚠️ No DuckDB instance to export');
      return;
    }

    console.log('💾 Exporting DuckDB to IndexedDB...');

    // Export patients table to Parquet file
    await globalConnection.query("COPY patients TO 'backup.parquet' (FORMAT PARQUET)");

    // Copy the Parquet file to buffer
    const backupBuffer = await globalDB.copyFileToBuffer('backup.parquet');

    // Save to IndexedDB
    await saveToIndexedDB(INDEXEDDB_KEY_DUCKDB, backupBuffer.buffer);

    console.log('✅ DuckDB exported to IndexedDB successfully');
  } catch (error) {
    console.error('❌ Error exporting DuckDB:', error);
    throw error;
  }
}

// Get current DuckDB connection
export function getDuckDBConnection() {
  return globalConnection;
}

// Query and update Svelte stores
export async function refreshStoresFromDB() {
  try {
    if (!globalConnection) {
      console.warn('⚠️ No DuckDB connection available');
      return;
    }

    // Query all patient data
    const result = await globalConnection.query('SELECT * FROM patients');
    const allData = result.toArray().map(row => {
      const obj = {};
      for (const key of Object.keys(row)) {
        if (row[key] instanceof Date) {
          obj[key] = row[key].toISOString();
        } else if (typeof row[key] === 'bigint') {
          obj[key] = row[key].toString();
        } else {
          obj[key] = row[key];
        }
      }
      return obj;
    });

    // Update parsedData store
    parsedData.set(allData);

    // Group by patient_no
    const grouped = allData.reduce((acc, row) => {
      const patientNo = row.patient_no;
      if (!acc[patientNo]) {
        acc[patientNo] = [];
      }
      acc[patientNo].push(row);
      return acc;
    }, {});

    // Update groupedPatientData store
    groupedPatientData.set(grouped);

    console.log('✅ Stores refreshed from DuckDB');
  } catch (error) {
    console.error('❌ Error refreshing stores:', error);
    throw error;
  }
}
