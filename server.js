// BARE METAL RD SCRAPER - FAST & SIMPLE
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 80;
const RD_KEY = 'IFQJ23NXPNHB53WNWTNABOZLPHUVCRAJTNZSVJHCHYFHBF2Z6WWQ';

const SCRAPERS = [
    { name: 'TF', url: 'https://e-n-hy.vercel.app' },
    { name: 'PF', url: 'https://addon.peerflix.mov/language=en%7Cqualityfilter=threed,540p,480p,vhs,screener,unknown%7Csort=language-asc,quality-desc,size-desc' },
    { name: 'TDB', url: 'https://torrentsdb.com/eyJwcm92aWRlcnMiOlsiZXp0diIsIjEzMzd4Iiwic2t0b3JyZW50IiwicmFyZ2IiLCJraWNrYXNzdG9ycmVudHMiLCJleHRyZW1seW10b3JyZW50cyJdLCJzb3J0IjoicXVhbGl0eXNpemUiLCJxdWFsaXR5ZmlsdGVyIjpbImhkcmFsbCIsImRvbGJ5dmlzaW9uIiwiZG9sYnl2aXNpb253aXRoaGRyIiwiNDgwcCIsInNjciIsImNhbSJdfQ==' },
    { name: 'OR', url: 'https://5a0d1888fa64-orion.baby-beamup.club/eyJhcGkiOiI2UkVWQVRVQ0pDNkFRR1BIOTJRS05ROE5KQkpVNkMzRCIsImxpbmtMaW1pdCI6IjI1Iiwic29ydFZhbHVlIjoidmlkZW9xdWFsaXR5IiwiYXVkaW9jaGFubmVscyI6IjIsNiw4IiwidmlkZW9xdWFsaXR5IjoiaGQ0ayxoZDEwODAsaGQ3MjAsc2QiLCJsaXN0T3B0IjoidG9ycmVudCIsImRlYnJpZHNlcnZpY2VzIjpbXSwiYXVkaW9sYW5ndWFnZXMiOlsiZW4iXSwiYWRkaXRpb25hbFBhcmFtZXRlcnMiOiIifQ' }
];

// ============================================
// MINIMAL RD CLASS
// ============================================
class RD {
    constructor(key) {
        this.key = key;
        this.base = 'https://api.real-debrid.com/rest/1.0';
    }

    async req(path, opts = {}) {
        const res = await fetch(`${this.base}${path}`, {
            ...opts,
            headers: { 'Authorization': `Bearer ${this.key}`, ...opts.headers },
            signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) throw new Error(`RD_${res.status}`);
        return res.status === 204 ? null : await res.json();
    }

    async add(mag, s, e) {
        try {
            // Add
            const add = await this.req('/torrents/addMagnet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `magnet=${encodeURIComponent(mag)}`
            });

            await this.wait(600);

            // Info
            let info = await this.req(`/torrents/info/${add.id}`);

            // Select
            if (info.status === 'waiting_files_selection') {
                const vids = info.files.filter(f => 
                    /\.(mkv|mp4|avi|mov|webm)$/i.test(f.path) && f.bytes > 50000000
                );
                if (!vids.length) throw new Error('NO_VID');

                let pick = vids[0];
                if (s && e) {
                    const ep = vids.find(f => {
                        const n = f.path.toLowerCase();
                        return new RegExp(`s0?${s}e0?${e}\\D`, 'i').test(n);
                    });
                    if (ep) pick = ep;
                } else {
                    pick = vids.reduce((a, b) => b.bytes > a.bytes ? b : a);
                }

                await this.req(`/torrents/selectFiles/${add.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `files=${pick.id}`
                });

                await this.wait(800);
                info = await this.req(`/torrents/info/${add.id}`);
            }

            // Check cached
            if (info.status !== 'downloaded') throw new Error('NOT_CACHED');

            // Get link
            const sel = info.files.find(f => f.selected === 1);
            if (!sel) throw new Error('NO_SEL');

            const idx = info.files.indexOf(sel);
            const link = info.links[idx];

            const dl = await this.req('/unrestrict/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `link=${encodeURIComponent(link)}`
            });

            return { url: dl.download, file: sel.path, size: sel.bytes };
        } catch (e) {
            throw e;
        }
    }

    wait(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// ============================================
// FETCH STREAMS
// ============================================
async function fetchStreams(type, imdb, s, e) {
    const id = type === 'series' ? `${imdb}:${s}:${e}` : imdb;
    
    const proms = SCRAPERS.map(sc => 
        fetch(`${sc.url}/stream/${type}/${id}.json`, { 
            signal: AbortSignal.timeout(10000) 
        })
        .then(r => r.json())
        .then(d => (d.streams || []).map(st => {
            let hash = null;
            if (st.infoHash) hash = st.infoHash.toUpperCase();
            else if (st.behaviorHints?.bingeGroup) {
                const m = st.behaviorHints.bingeGroup.match(/\|([a-fA-F0-9]{40})$/);
                if (m) hash = m[1].toUpperCase();
            }
            return hash ? {
                hash,
                mag: `magnet:?xt=urn:btih:${hash}`,
                name: st.name || st.title || '',
                src: sc.name
            } : null;
        }).filter(Boolean))
        .catch(() => [])
    );

    const all = (await Promise.all(proms)).flat();
    
    // Dedupe
    const seen = new Set();
    return all.filter(s => {
        if (seen.has(s.hash)) return false;
        seen.add(s.hash);
        return true;
    });
}

// ============================================
// ROUTES
// ============================================
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.get('/manifest.json', (req, res) => {
    res.json({
        id: 'rd.fast.scraper',
        version: '1.0.0',
        name: 'RD Fast',
        resources: ['stream'],
        types: ['movie', 'series'],
        catalogs: [],
        idPrefixes: ['tt']
    });
});

app.get('/stream/:type/:id', async (req, res) => {
    try {
        const { type, id: raw } = req.params;
        const id = decodeURIComponent(raw.replace('.json', ''));
        
        let imdb, s, e;
        if (type === 'movie') {
            imdb = id;
        } else {
            [imdb, s, e] = id.split(':');
            s = parseInt(s);
            e = parseInt(e);
        }

        console.log(`\n🎬 ${type} ${imdb}${s ? ` S${s}E${e}` : ''}`);

        // Get streams
        const streams = await fetchStreams(type, imdb, s, e);
        console.log(`📊 ${streams.length} streams`);

        if (!streams.length) {
            return res.json({ streams: [] });
        }

        // Test in batches
        const rd = new RD(RD_KEY);
        const results = [];
        const BATCH = 4;
        const MAX = 30;

        for (let i = 0; i < Math.min(streams.length, MAX) && results.length < 12; i += BATCH) {
            const batch = streams.slice(i, i + BATCH);
            
            const proms = batch.map(async st => {
                console.log(`🧪 ${st.hash.substring(0, 8)} | ${st.src}`);
                try {
                    const res = await rd.add(st.mag, s, e);
                    console.log(`✅ CACHED`);
                    
                    const q = st.name.match(/\b(2160p|1080p|720p|480p)\b/i)?.[1]?.toUpperCase() || '1080P';
                    const sz = res.size ? `${(res.size / 1073741824).toFixed(1)}GB` : '';
                    
                    return {
                        name: `⚡ ${q} | ${sz} | ${st.src}`,
                        title: `${q}\n${sz}\n${st.src}\n${res.file.split('/').pop()}`,
                        url: res.url
                    };
                } catch (e) {
                    console.log(`❌ ${e.message}`);
                    return null;
                }
            });

            const done = await Promise.allSettled(proms);
            done.forEach(r => {
                if (r.status === 'fulfilled' && r.value && results.length < 12) {
                    results.push(r.value);
                }
            });

            if (i + BATCH < Math.min(streams.length, MAX)) {
                await new Promise(r => setTimeout(r, 300));
            }
        }

        console.log(`🎉 ${results.length} streams\n`);

        if (!results.length) {
            return res.json({
                streams: [{
                    name: '🚫 None cached',
                    title: 'No cached on RD',
                    url: '',
                    behaviorHints: { notWebReady: true }
                }]
            });
        }

        res.json({ streams: results });

    } catch (error) {
        console.error('❌', error);
        res.json({
            streams: [{
                name: '❌ Error',
                title: error.message,
                url: '',
                behaviorHints: { notWebReady: true }
            }]
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', version: '1.0.0' });
});

app.listen(PORT, () => {
    console.log(`🚀 Fast scraper on :${PORT}`);
});
