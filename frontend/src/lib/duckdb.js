import { writable } from 'svelte/store';
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

export const parsedData = writable([]);
export const groupedPatientData = writable({});

// Function to initialize DuckDB-WASM
export async function initializeDuckDB() {
  try {
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
    // console.log('DuckDB initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing DuckDB:', error);
    throw error;
  }
}
