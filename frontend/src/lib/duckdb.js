import { writable } from 'svelte/store';
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

// SessionStorage keys
const STORAGE_KEY_PARSED = 'cdm_review_parsed_data';
const STORAGE_KEY_GROUPED = 'cdm_review_grouped_data';

// Create stores with sessionStorage synchronization
function createSyncedStore(key, initialValue) {
  // Try to load from sessionStorage on initialization
  let storedValue = initialValue;
  if (typeof window !== 'undefined') {
    try {
      const item = sessionStorage.getItem(key);
      if (item) {
        storedValue = JSON.parse(item);
        console.log(`Loaded ${key} from sessionStorage`);
      }
    } catch (error) {
      console.error(`Error loading ${key} from sessionStorage:`, error);
    }
  }

  const store = writable(storedValue);

  // Subscribe to store changes and sync to sessionStorage
  if (typeof window !== 'undefined') {
    store.subscribe(value => {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error saving ${key} to sessionStorage:`, error);
      }
    });
  }

  return store;
}

export const parsedData = createSyncedStore(STORAGE_KEY_PARSED, []);
export const groupedPatientData = createSyncedStore(STORAGE_KEY_GROUPED, {});

// Clear data from sessionStorage
export function clearDataFromSessionStorage() {
  try {
    sessionStorage.removeItem(STORAGE_KEY_PARSED);
    sessionStorage.removeItem(STORAGE_KEY_GROUPED);
    parsedData.set([]);
    groupedPatientData.set({});
    console.log('Data cleared from sessionStorage');
  } catch (error) {
    console.error('Error clearing data from sessionStorage:', error);
  }
}

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
