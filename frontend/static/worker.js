// self.onmessage = function(e) {
//     const { data, toxicList } = e.data;   // data = drugConceptId
//     const toxicIds = toxicList.map(entry => entry.cdm_id);
//     const toxic = data.filter(id => toxicIds.includes(id));
//     const safe = data.filter(id => !toxicIds.includes(id));
//     self.postMessage({ingredient, toxic, safe});
// };

self.onmessage = function(e) {
    const { data, toxicList } = e.data;   // data = drugConceptId
    
    // toxicList에서 cdm_id와 ingredient를 객체로 매핑
    const toxicMap = toxicList.reduce((acc, entry) => {
        acc[entry.cdm_id] = entry.ingredient; // cdm_id를 키로, ingredient를 값으로 저장
        return acc;
    }, {});

    // toxic과 safe 배열 생성
    const toxic = [];
    const safe = [];

    data.forEach(id => {
        if (id in toxicMap) {
            // toxic 배열에 cdm_id와 해당 ingredient 포함
            toxic.push({ cdm_id: id, ingredient: toxicMap[id] });
        } else {
            // safe 배열에는 cdm_id만 포함
            safe.push({ cdm_id: id });
        }
    });

    // 결과 메시지로 ingredient와 함께 toxic 및 safe 목록 전송
    self.postMessage({ toxic, safe });
};
