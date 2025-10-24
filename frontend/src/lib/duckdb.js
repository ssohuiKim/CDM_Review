import { writable } from 'svelte/store';
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import { saveToIndexedDB, loadFromIndexedDB, clearIndexedDB } from './indexedDB';

// IndexedDB keys
const INDEXEDDB_KEY_PARSED = 'parsed_data';
const INDEXEDDB_KEY_GROUPED = 'grouped_patient_data';

// Create stores with IndexedDB synchronization
function createIndexedDBStore(key, initialValue) {
  const store = writable(initialValue);
  let isInitialized = false;

  // Load from IndexedDB on initialization
  if (typeof window !== 'undefined') {
    loadFromIndexedDB(key).then(storedValue => {
      if (storedValue !== null) {
        store.set(storedValue);
        console.log(`✅ Loaded ${key} from IndexedDB`);
      }
      isInitialized = true;
    }).catch(error => {
      console.error(`❌ Error loading ${key} from IndexedDB:`, error);
      isInitialized = true;
    });
  }

  // Subscribe to store changes and sync to IndexedDB
  if (typeof window !== 'undefined') {
    let saveTimeout;
    store.subscribe(value => {
      // 초기화 완료 후에만 저장 (무한 루프 방지)
      if (!isInitialized) return;
      
      // Debounce: 너무 자주 저장하지 않도록 500ms 대기
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveToIndexedDB(key, value).catch(error => {
          console.error(`❌ Error saving ${key} to IndexedDB:`, error);
        });
      }, 500);
    });
  }

  return store;
}

export const parsedData = createIndexedDBStore(INDEXEDDB_KEY_PARSED, []);
export const groupedPatientData = createIndexedDBStore(INDEXEDDB_KEY_GROUPED, {});

// Clear data from IndexedDB
export async function clearDataFromIndexedDB() {
  try {
    await clearIndexedDB();
    parsedData.set([]);
    groupedPatientData.set({});
    console.log('✅ Data cleared from IndexedDB');
  } catch (error) {
    console.error('❌ Error clearing data from IndexedDB:', error);
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
