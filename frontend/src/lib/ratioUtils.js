export const normalize = s => String(s ?? '').toLowerCase().trim();

export function classifyDaySets(dayIndex, {drug_concept_id, drug_name, days, toxic_id, toxic, safe_id=[], safe=[]}) {
  const toxIdSet    = new Set((toxic_id || []).map(String));
  const toxNameSet  = new Set((toxic    || []).map(n => normalize(n)));
  const safeIdSet   = new Set((safe_id  || []).map(String));
  const safeNameSet = new Set((safe     || []).map(n => normalize(n)));
  const HAS_SAFE    = (safeIdSet.size > 0 || safeNameSet.size > 0);

  const seenTox  = new Set();
  const seenSafe = new Set();

  for (let i = 0; i < drug_concept_id.length; i++) {
    if (days[i] !== dayIndex) continue;
    const name = normalize(drug_name[i]);
    if (!name || name === 'unknown') continue;

    const idStr = String(drug_concept_id[i] ?? '');
    const isToxic = toxNameSet.has(name) || toxIdSet.has(idStr);
    const isSafe  = safeNameSet.has(name) || safeIdSet.has(idStr);

    if (isToxic) seenTox.add(name);
    else if (HAS_SAFE ? isSafe : true) seenSafe.add(name);
  }
  return { seenTox, seenSafe };
}

export function calculateDailyRatio(dayIndex, payload) {
  const { seenTox, seenSafe } = classifyDaySets(dayIndex, payload);
  return { toxicCount: seenTox.size, totalCount: seenTox.size + seenSafe.size };
}

export function calculateCumulative7DayRatio(dayIndex, payload) {
  const startDay = Math.max(1, dayIndex - 6);
  let toxSum = 0, totalSum = 0;
  for (let d = startDay; d <= dayIndex; d++) {
    const { seenTox, seenSafe } = classifyDaySets(d, payload);
    toxSum   += seenTox.size;
    totalSum += seenTox.size + seenSafe.size;
  }
  return { toxicCount: toxSum, totalCount: totalSum };
}
