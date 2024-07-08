self.onmessage = function(e) {
    const { data, toxicList, drugList } = e.data;
    const lowercaseToxicList = toxicList.map(name => name.toLowerCase());
    const lowercaseDrugList = drugList.map(name => name.toLowerCase());
    const filteredData = data.filter(name => name !== null && !lowercaseDrugList.includes(name.toLowerCase())).map(name => name.toLowerCase());
    const toxic = filteredData.filter(name => lowercaseToxicList.includes(name));
    const safe = filteredData.filter(name => !lowercaseToxicList.includes(name));
    self.postMessage({ toxic, safe });
};
