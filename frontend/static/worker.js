
// self.onmessage = function(e) {
//     const ici = ["42920398", "1594046", "1594038", "46275962", "42920744", "42922127", "42921578"];
//     const { data, toxicList } = e.data;

//     // toxicList에서 cdm_id를 키로, ingredient를 값으로 하는 객체 생성
//     const toxicMap = new Map(toxicList.map(item => [item.cdm_id, item.ingredient]));

//     // toxic_ingredients 필터링 및 매핑
//     const toxic_ingredients_with_ids = data
//         .filter(id => toxicMap.has(id) && !ici.includes(id))
//         .map(id => ({ id, ingredient: toxicMap.get(id) }))
//         .filter(item => item.ingredient !== "#REF!" && item.ingredient !== undefined);

//     // 고유한 toxic 약물 이름만 추출
//     const toxic_ingredients = [...new Set(toxic_ingredients_with_ids.map(item => item.ingredient))];
//     const toxic_id = [...new Set(toxic_ingredients_with_ids.map(item => item.id))];

//     // safe_id 필터링
//     const safe_id = data.filter(id => !toxicMap.has(id));

//     // postMessage로 각 결과 전송
//     self.postMessage({ toxic_ingredients, toxic_id, safe_id });
// };

self.onmessage = function(e) {
    const ici = ["42920398", "1594046", "1594038", "46275962", "42920744", "42922127", "42921578"];
    const { data, toxicList } = e.data;

    // toxicList에서 cdm_id를 키로, ingredient를 값으로 하는 객체 생성
    const toxicMap = new Map(toxicList.map(item => [item.cdm_id, item.ingredient]));
    
    
    const acetaminophenEntries = Array.from(toxicMap.entries())
        .filter(([cdm_id, ingredient]) => ingredient === "acetaminophen");

    console.log("Acetaminophen cdm_ids and their ingredients:", acetaminophenEntries);
    
    // 독성 성분 필터링 및 매핑
    const toxic_ingredients_with_ids = data
        .filter(id => toxicMap.has(id) && !ici.includes(id))
        .map(id => ({ id, ingredient: toxicMap.get(id) }))
        .filter(item => item.ingredient !== "#REF!" && item.ingredient !== undefined);

    // 고유한 toxic 약물 이름과 ID를 각각 배열에 저장
    const toxic_ingredients = [...new Set(toxic_ingredients_with_ids.map(item => item.ingredient))];

    // 각 ingredient에 고유 인덱스를 부여하는 맵
    const ingredientIndexMap = new Map(toxic_ingredients.map((ingredient, index) => [ingredient, index + 1]));

    // cdm_id별로 동일한 ingredient 인덱스를 매핑
    const toxicIndexMap = new Map(
        toxic_ingredients_with_ids.map(item => [item.id, ingredientIndexMap.get(item.ingredient)])
    );

    // safe_id 필터링
    const safe_id = data.filter(id => !toxicMap.has(id));

    // postMessage로 각 결과 전송
    self.postMessage({ toxic_ingredients, toxic_id: [...toxicIndexMap.keys()], safe_id, toxicIndexMap });
};
