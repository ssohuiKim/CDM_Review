/**
 * IndexedDB 유틸리티
 * CDM Review 데이터를 브라우저의 IndexedDB에 저장/복원
 */

const DB_NAME = 'cdm_review_db';
const DB_VERSION = 1;
const STORE_NAME = 'patient_data';

/**
 * IndexedDB 열기 및 초기화
 */
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB 열기 실패:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Object Store 생성 (테이블 역할)
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('IndexedDB Object Store 생성됨');
      }
    };
  });
}

/**
 * 데이터 저장
 */
export async function saveToIndexedDB(key, data) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const record = {
      id: key,
      data: data,
      timestamp: Date.now()
    };
    
    const request = store.put(record);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`✅ IndexedDB 저장 성공: ${key}`);
        resolve();
      };
      
      request.onerror = () => {
        console.error(`❌ IndexedDB 저장 실패: ${key}`, request.error);
        reject(request.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('IndexedDB 저장 오류:', error);
    throw error;
  }
}

/**
 * 데이터 불러오기
 */
export async function loadFromIndexedDB(key) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          console.log(`✅ IndexedDB 불러오기 성공: ${key}`);
          resolve(result.data);
        } else {
          console.log(`ℹ️ IndexedDB에 데이터 없음: ${key}`);
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error(`❌ IndexedDB 불러오기 실패: ${key}`, request.error);
        reject(request.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('IndexedDB 불러오기 오류:', error);
    return null;
  }
}

/**
 * 데이터 삭제
 */
export async function deleteFromIndexedDB(key) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`✅ IndexedDB 삭제 성공: ${key}`);
        resolve();
      };
      
      request.onerror = () => {
        console.error(`❌ IndexedDB 삭제 실패: ${key}`, request.error);
        reject(request.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('IndexedDB 삭제 오류:', error);
    throw error;
  }
}

/**
 * 모든 데이터 삭제
 */
export async function clearIndexedDB() {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('✅ IndexedDB 전체 삭제 성공');
        resolve();
      };
      
      request.onerror = () => {
        console.error('❌ IndexedDB 전체 삭제 실패', request.error);
        reject(request.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('IndexedDB 전체 삭제 오류:', error);
    throw error;
  }
}
