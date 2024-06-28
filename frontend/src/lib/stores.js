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
