import { writable } from 'svelte/store';

export const parsedData = writable([]);

// make sample data for patientNos which containes patient's number data like pareseData's type 0~ 100
export const patientNos = [...Array(100).keys()];