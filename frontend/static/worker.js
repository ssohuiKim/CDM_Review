self.onmessage = function(e) {
    const { data, toxicList } = e.data;
    const lowercaseToxicList = toxicList.map(name => name.toLowerCase());
    const toxic = data.filter(name => lowercaseToxicList.includes(name));
    const safe = data.filter(name => !lowercaseToxicList.includes(name));
    self.postMessage({ toxic, safe });
};
