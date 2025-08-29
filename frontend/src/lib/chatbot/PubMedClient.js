/**
 * pubmed.js — Minimal PubMed (NCBI E-utilities) client with 1s/3req rate limit
 *
 * Requirements:
 * - Modern browsers with fetch API
 * - Respect default NCBI rate limit (≤ 3 req/sec without API key)
 * - Lightweight retry for 429/5xx with Retry-After + exponential backoff
 */

// --------------------------- Utility: build URL ---------------------------
function buildUrl(base, params) {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  }
  return u.toString();
}

// -------------------------- Token-bucket limiter --------------------------
class RateLimiter {
  constructor(maxPerSecond = 3) {
    this.capacity = maxPerSecond;
    this.tokens = maxPerSecond;
    this.queue = [];
    
    setInterval(() => {
      this.tokens = this.capacity; // refill once per second
      this.drain();
    }, 1000);
  }

  schedule(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.drain();
    });
  }

  drain() {
    while (this.tokens > 0 && this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift();
      this.tokens -= 1;
      Promise.resolve()
        .then(task)
        .then(resolve)
        .catch(reject);
    }
  }
}

// ------------------------------- Main client ------------------------------
export class PubMedClient {
  constructor(opts = {}) {
    this.base = opts.baseUrl ?? "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
    this.apiKey = opts.apiKey;
    this.limiter = new RateLimiter(opts.maxRps ?? 3);
  }

  async request(path, params = {}, retries = 2) {
    const url = buildUrl(`${this.base}/${path}`, { ...params, api_key: this.apiKey });
    const doFetch = () => fetch(url, { method: "GET" });

    let res = await this.limiter.schedule(doFetch);
    let attempt = 0;

    while (!res.ok && attempt < retries && (res.status === 429 || (res.status >= 500 && res.status < 600))) {
      attempt += 1;
      const retryAfter = Number(res.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(2000, 400 * 2 ** (attempt - 1));
      await new Promise((r) => setTimeout(r, delayMs));
      res = await this.limiter.schedule(doFetch);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} – ${text.slice(0, 200)}`);
    }
    return res;
  }

  /**
   * ESearch: search PMIDs by term and optional filters.
   */
  async esearch(opts) {
    const res = await this.request("esearch.fcgi", {
      db: "pubmed",
      term: opts.term,
      retmax: opts.retmax ?? 20,
      retstart: opts.retstart ?? 0,
      retmode: "json",
      sort: opts.sort,
      mindate: opts.mindate,
      maxdate: opts.maxdate,
      datetype: opts.datetype ?? "pdat",
    });

    const json = await res.json();
    return {
      count: Number(json.esearchresult?.count ?? 0),
      pmids: json.esearchresult?.idlist ?? [],
    };
  }

  /**
   * ESummary: fetch summary metadata for a list of PMIDs (order preserved as given).
   */
  async esummary(pmids) {
    if (!pmids?.length) return [];
    const res = await this.request("esummary.fcgi", {
      db: "pubmed",
      id: pmids.join(","),
      retmode: "json",
    });

    const json = await res.json();
    const out = [];
    for (const pmid of pmids) {
      const item = json.result?.[pmid];
      if (!item) continue;
      const doi = item.articleids?.find((a) => a.idtype === "doi")?.value;
      out.push({
        pmid,
        title: item.title,
        journal: item.fulljournalname,
        pubdate: item.pubdate,
        authors: (item.authors ?? []).map((a) => a.name ?? "").filter(Boolean),
        doi,
      });
    }
    return out;
  }

  /**
   * EFetch: XML payload (for abstracts, etc.).
   * Note: EFetch for PubMed does not provide JSON; use XML parsing if needed.
   */
  async efetchXml(pmids) {
    if (!pmids?.length) return "<Empty/>";
    const res = await this.request("efetch.fcgi", {
      db: "pubmed",
      id: pmids.join(","),
      retmode: "xml",
    });
    return await res.text();
  }

  /**
   * Search and get paper details with abstracts
   */
  async searchWithDetails(searchTerm, maxResults = 5) {
    try {
      // Search for papers
      const searchResult = await this.esearch({
        term: searchTerm,
        retmax: maxResults,
        sort: "most+recent"
      });

      if (searchResult.pmids.length === 0) {
        return { papers: [], total: 0 };
      }

      // Get summaries
      const summaries = await this.esummary(searchResult.pmids);

      // Get abstracts (XML format)
      const xmlData = await this.efetchXml(searchResult.pmids);

      // Parse abstracts from XML (simple extraction)
      const abstracts = this.parseAbstractsFromXml(xmlData);

      // Combine data
      const papers = summaries.map((summary, index) => ({
        title: summary.title || 'No title available',
        abstract: abstracts[summary.pmid] || 'Abstract not available',
        url: `https://pubmed.ncbi.nlm.nih.gov/${summary.pmid}`,
        authors: summary.authors?.join(', ') || 'Unknown authors',
        journal: summary.journal || 'Unknown journal',
        year: summary.pubdate ? summary.pubdate.split(' ')[0] : 'Unknown year',
        pmid: summary.pmid,
        doi: summary.doi
      }));

      return {
        papers,
        total: searchResult.count
      };
    } catch (error) {
      console.error('PubMed search error:', error);
      throw error;
    }
  }

  /**
   * Simple XML parser to extract abstracts
   */
  parseAbstractsFromXml(xmlString) {
    const abstracts = {};
    
    try {
      // Use DOMParser in browser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      const articles = xmlDoc.getElementsByTagName('PubmedArticle');
      
      for (let article of articles) {
        const pmidElement = article.querySelector('PMID');
        const abstractElement = article.querySelector('AbstractText');
        
        if (pmidElement && abstractElement) {
          const pmid = pmidElement.textContent;
          const abstract = abstractElement.textContent;
          abstracts[pmid] = abstract;
        }
      }
    } catch (error) {
      console.error('XML parsing error:', error);
    }
    
    return abstracts;
  }
}

export default PubMedClient;
