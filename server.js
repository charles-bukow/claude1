// RD Multi-Scraper - Node.js/Express Version
// OPTIMIZED with proper working RD pattern

import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 80;

const HARDCODED_REALDEBRID_KEY = 'IFQJ23NXPNHB53WNWTNABOZLPHUVCRAJTNZSVJHCHYFHBF2Z6WWQ';
const TMDB_API_KEY = 'f051e7366c6105ad4f9aafe4733d9dae';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const SCRAPERS = {
    MEDIAFUSION: {
        name: 'MEDIAFUSION',
        baseUrl: 'https://mediafusion.elfhosted.com/D-fptsLJeaZq_VyEMjSy-LN-SFl3Yz6ql8K8A4t9n6-oXcHSuC-CSKU8HsWxTqbpUB0R5cbKXnX-YYesHs5xp54tHkVEBjiUoMXIUlbj5kElkmAFgrL1pXNXj6Ia0A8ixHHi9rNOeY65l25D8qAW84Zuz03VaOb7LWbTNiE2MRc2g',
        enabled: true,
        priority: 5
    },
    STREMTHRU: {
        name: 'STREMTHRU',
        baseUrl: 'https://stremthru.13377001.xyz/stremio/torz/eyJpbmRleGVycyI6bnVsbCwic3RvcmVzIjpbeyJjIjoicDJwIiwidCI6IiJ9XX0=',
        enabled: true,
        priority: 4
    },
    TORRENTIO: {
        name: 'TORRENTIO',
        baseUrl: 'https://e-n-hy.vercel.app',
        enabled: true,
        priority: 3
    },
    PEERFLIX: {
        name: 'PEERFLIX',
        baseUrl: 'https://addon.peerflix.mov/language=en%7Cqualityfilter=threed,540p,480p,vhs,screener,unknown%7Csort=language-asc,quality-desc,size-desc',
        enabled: true,
        priority: 2
    },
    TORRENTSDB: {
        name: 'TORRENTSDB',
        baseUrl: 'https://torrentsdb.com/eyJwcm92aWRlcnMiOlsiZXp0diIsIjEzMzd4Iiwic2t0b3JyZW50IiwicmFyZ2IiLCJraWNrYXNzdG9ycmVudHMiLCJleHRyZW1seW10b3JyZW50cyJdLCJzb3J0IjoicXVhbGl0eXNpemUiLCJxdWFsaXR5ZmlsdGVyIjpbImhkcmFsbCIsImRvbGJ5dmlzaW9uIiwiZG9sYnl2aXNpb253aXRoaGRyIiwiNDgwcCIsInNjciIsImNhbSJdfQ==',
        enabled: true,
        priority: 2
    },
    COMET: {
        name: 'COMET',
        baseUrl: 'https://comet.elfhosted.com/eyJtYXhSZXN1bHRzUGVyUmVzb2x1dGlvbiI6MCwibWF4U2l6ZSI6MCwiY2FjaGVkT25seSI6ZmFsc2UsInJlbW92ZVRyYXNoIjp0cnVlLCJyZXN1bHRGb3JtYXQiOlsiYWxsIl0sImRlYnJpZFNlcnZpY2UiOiJ0b3JyZW50IiwiZGVicmlkQXBpS2V5IjoiIiwiZGVicmlkU3RyZWFtUHJveHlQYXNzd29yZCI6IiIsImxhbmd1YWdlcyI6eyJleGNsdWRlIjpbXSwicHJlZmVycmVkIjpbIm11bHRpIiwiZW4iXX0sInJlc29sdXRpb25zIjp7InI0ODBwIjpmYWxzZSwicjM2MHAiOmZhbHNlLCJ1bmtub3duIjpmYWxzZX0sIm9wdGlvbnMiOnsicmVtb3ZlX3JhbmtzX3VuZGVyIjotMTAwMDAwMDAwMDAsImFsbG93X2VuZ2xpc2hfaW5fbGFuZ3VhZ2VzIjp0cnVlLCJyZW1vdmVfdW5rbm93bl9sYW5ndWFnZXMiOmZhbHNlfX0=',
        enabled: true,
        priority: 1
    }
};

const ADDON_MANIFEST = {
    id: 'com.universal.scraper.realdebrid.nodejs',
    version: '5.0.0',
    name: 'RD Multi-Scraper (Optimized)',
    description: 'Fast parallel testing with proper RD cache detection',
    logo: 'https://png.pngtree.com/png-clipart/20240327/original/pngtree-explosion-nuclear-bomb-png-image_14690537.png',
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: [],
    idPrefixes: ['tt']
};

// ============================================
// OPTIMIZED REAL-DEBRID CLASS
// Using proper working pattern from real addons
// ============================================

class RealDebrid {
    constructor(apiKey) {
        this.apiKey = apiKey.trim();
        this.baseUrl = 'https://api.real-debrid.com/rest/1.0';
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers,
            timeout: 8000
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`RD_${response.status}: ${text}`);
        }

        if (response.status === 204) return null;
        return await response.json();
    }

    async testMagnetCached(magnetLink, targetSeason = null, targetEpisode = null) {
        try {
            // Add magnet
            const formData = new URLSearchParams();
            formData.append('magnet', magnetLink);

            const addResponse = await this.makeRequest('/torrents/addMagnet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            const torrentId = addResponse.id;
            await this.delay(500);

            // Get torrent info
            let torrent = await this.makeRequest(`/torrents/info/${torrentId}`);

            // CRITICAL: Check status immediately for cache
            // If downloading/queued = NOT cached, bail fast
            if (torrent.status === 'downloading' || torrent.status === 'queued') {
                throw new Error('NOT_CACHED');
            }

            // Handle file selection
            if (torrent.status === 'waiting_files_selection') {
                const videoFiles = torrent.files.filter(f => 
                    this.isVideoFile(f.path) && f.bytes > 50 * 1024 * 1024
                );

                if (videoFiles.length === 0) {
                    throw new Error('NO_VIDEO');
                }

                let selectedFile = null;
                if (targetSeason && targetEpisode) {
                    selectedFile = this.findEpisode(videoFiles, targetSeason, targetEpisode);
                }

                if (!selectedFile) {
                    selectedFile = videoFiles.reduce((max, f) => f.bytes > max.bytes ? f : max);
                }

                const selectFormData = new URLSearchParams();
                selectFormData.append('files', selectedFile.id.toString());

                await this.makeRequest(`/torrents/selectFiles/${torrentId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: selectFormData.toString()
                });

                await this.delay(700);
                torrent = await this.makeRequest(`/torrents/info/${torrentId}`);
            }

            // Check if cached (status = downloaded)
            if (torrent.status !== 'downloaded') {
                throw new Error(`NOT_CACHED`);
            }

            // Get download link
            const selectedFiles = torrent.files.filter(f => f.selected === 1);
            if (selectedFiles.length === 0) {
                throw new Error('NO_SELECTED');
            }

            const fileIndex = torrent.files.indexOf(selectedFiles[0]);
            const downloadLink = torrent.links[fileIndex];

            const unrestrictFormData = new URLSearchParams();
            unrestrictFormData.append('link', downloadLink);

            const unrestrictResponse = await this.makeRequest('/unrestrict/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: unrestrictFormData.toString()
            });

            return {
                url: unrestrictResponse.download,
                filename: selectedFiles[0].path,
                filesize: selectedFiles[0].bytes
            };

        } catch (error) {
            throw error;
        }
    }

    findEpisode(files, season, episode) {
        const patterns = [
            new RegExp(`s0?${season}e0?${episode}\\D`, 'i'),
            new RegExp(`${season}x0?${episode}\\D`, 'i'),
            new RegExp(`[._\\s]e0?${episode}[._\\s]`, 'i')
        ];

        for (const file of files) {
            const name = file.path.toLowerCase();
            if (patterns.some(p => p.test(name))) {
                return file;
            }
        }
        return null;
    }

    isVideoFile(path) {
        const exts = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.ts', '.flv'];
        return exts.some(ext => path.toLowerCase().endsWith(ext));
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================
// SCRAPER AGGREGATOR
// ============================================

class ScraperAggregator {
    constructor() {
        this.enabledScrapers = Object.values(SCRAPERS).filter(s => s.enabled);
    }

    async fetchAllStreams(type, imdbId, season = null, episode = null) {
        let fullId = imdbId;
        if (type === 'series' && season && episode) {
            fullId = `${imdbId}:${season}:${episode}`;
        }

        console.log(`\n🎬 Fetching from ${this.enabledScrapers.length} scrapers`);
        
        const fetchPromises = this.enabledScrapers.map(scraper => 
            this.fetchFromScraper(scraper, type, fullId)
        );

        const allResults = await Promise.allSettled(fetchPromises);
        
        const allStreams = [];
        
        allResults.forEach((result, index) => {
            const scraper = this.enabledScrapers[index];
            if (result.status === 'fulfilled' && result.value) {
                console.log(`✅ ${scraper.name}: ${result.value.length}`);
                allStreams.push(...result.value);
            }
        });

        // Dedupe
        const seen = new Set();
        const unique = allStreams.filter(s => {
            if (seen.has(s.infoHash)) return false;
            seen.add(s.infoHash);
            return true;
        });

        console.log(`📊 Total: ${unique.length} unique magnets`);
        return unique;
    }

    async fetchFromScraper(scraper, type, id) {
        try {
            const streamUrl = `${scraper.baseUrl}/stream/${type}/${encodeURIComponent(id)}.json`;
            
            const response = await fetch(streamUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                },
                timeout: 12000
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            
            if (!data.streams || !Array.isArray(data.streams)) return [];

            return data.streams.map(stream => {
                let infoHash = null;
                let magnetLink = null;

                if (stream.infoHash) {
                    infoHash = stream.infoHash.toUpperCase();
                    magnetLink = `magnet:?xt=urn:btih:${infoHash}`;
                } else if (stream.behaviorHints?.bingeGroup) {
                    const bingeMatch = stream.behaviorHints.bingeGroup.match(/\|([a-fA-F0-9]{40})$/);
                    if (bingeMatch) {
                        infoHash = bingeMatch[1].toUpperCase();
                        magnetLink = `magnet:?xt=urn:btih:${infoHash}`;
                    }
                } else if (stream.url?.includes('magnet:')) {
                    magnetLink = stream.url;
                    infoHash = extractInfoHash(magnetLink);
                }

                return {
                    name: stream.name || stream.title || '',
                    magnetLink,
                    infoHash,
                    quality: extractQuality(stream.name || stream.title || ''),
                    scraperSource: scraper.name,
                    scraperPriority: scraper.priority,
                    originalStream: stream
                };
            }).filter(s => s.magnetLink && s.infoHash);

        } catch (error) {
            throw error;
        }
    }
}

// ============================================
// HELPERS
// ============================================

function extractInfoHash(magnetLink) {
    if (!magnetLink) return null;
    const match = magnetLink.match(/btih:([a-fA-F0-9]{40})/i);
    return match ? match[1].toUpperCase() : null;
}

function extractQuality(title) {
    if (!title) return '';
    const qualityMatch = title.match(/\b(2160p|1080p|720p|480p|4k|uhd)\b/i);
    return qualityMatch ? qualityMatch[1].toUpperCase() : '';
}

function formatFileSize(bytes) {
    if (!bytes) return '';
    const gb = bytes / (1024 ** 3);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
}

function getQualitySymbol(quality) {
    const q = quality.toLowerCase();
    if (q.includes('2160') || q.includes('4k')) return '🔥';
    if (q.includes('1080')) return '⭐';
    if (q.includes('720')) return '✅';
    return '🎬';
}

async function getTMDBDetails(imdbId) {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`,
            { timeout: 5000 }
        );
        const data = await response.json();
        
        if (data.movie_results?.[0]) {
            const movie = data.movie_results[0];
            return {
                title: movie.title,
                year: movie.release_date ? movie.release_date.substring(0, 4) : '',
                type: 'movie'
            };
        }
        
        if (data.tv_results?.[0]) {
            const show = data.tv_results[0];
            return {
                title: show.name,
                year: show.first_air_date ? show.first_air_date.substring(0, 4) : '',
                type: 'series'
            };
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

function smartSortStreams(streams) {
    const qualityScore = (quality) => {
        const q = quality.toLowerCase();
        if (q.includes('2160') || q.includes('4k')) return 4;
        if (q.includes('1080')) return 3;
        if (q.includes('720')) return 2;
        if (q.includes('480')) return 1;
        return 0;
    };

    return streams.sort((a, b) => {
        if (a.scraperPriority !== b.scraperPriority) {
            return b.scraperPriority - a.scraperPriority;
        }
        const qualityDiff = qualityScore(b.quality) - qualityScore(a.quality);
        if (qualityDiff !== 0) return qualityDiff;
        return Math.random() - 0.5;
    });
}

// ============================================
// PARALLEL BATCH TESTER - OPTIMIZED
// ============================================

async function testStreamsInParallel(streams, rd, targetStreams, season, episode) {
    const BATCH_SIZE = 5;
    const MAX_TESTS = 30;
    const finalStreams = [];
    
    console.log(`\n🧪 Testing up to ${MAX_TESTS} magnets (${BATCH_SIZE} parallel)...`);

    const streamsToTest = streams.slice(0, MAX_TESTS);
    
    for (let i = 0; i < streamsToTest.length && finalStreams.length < targetStreams; i += BATCH_SIZE) {
        const batch = streamsToTest.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (stream, idx) => {
            const testNum = i + idx + 1;
            console.log(`${testNum}/${MAX_TESTS}: ${stream.quality || '?'} | ${stream.scraperSource}`);
            
            try {
                const result = await rd.testMagnetCached(stream.magnetLink, season, episode);
                
                if (result && result.url) {
                    const quality = stream.quality || extractQuality(result.filename);
                    const qualitySymbol = getQualitySymbol(quality);
                    const fileSize = formatFileSize(result.filesize);

                    console.log(`✅ CACHED! ${quality}`);

                    return {
                        stream,
                        result,
                        quality,
                        qualitySymbol,
                        fileSize
                    };
                }
            } catch (error) {
                console.log(`❌ ${error.message.substring(0, 30)}`);
            }
            
            return null;
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value && finalStreams.length < targetStreams) {
                finalStreams.push(result.value);
            }
        });

        if (finalStreams.length >= targetStreams) break;
        
        if (i + BATCH_SIZE < streamsToTest.length) {
            await new Promise(resolve => setTimeout(resolve, 400));
        }
    }

    return finalStreams;
}

// ============================================
// EXPRESS ROUTES
// ============================================

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.get('/manifest.json', (req, res) => {
    res.json(ADDON_MANIFEST);
});

app.get('/stream/:type/:id', async (req, res) => {
    try {
        const { type, id: rawId } = req.params;
        let id = rawId.replace('.json', '');
        id = decodeURIComponent(id);

        let imdbId, season, episode;

        if (type === 'movie') {
            imdbId = id;
        } else {
            const parts = id.split(':');
            imdbId = parts[0];
            season = parts[1] ? parseInt(parts[1], 10) : null;
            episode = parts[2] ? parseInt(parts[2], 10) : null;

            if (!season || !episode) {
                return res.json({ streams: [] });
            }
        }

        console.log(`\n🎬 ${type} - ${imdbId}${type === 'series' ? ` S${season}E${episode}` : ''}`);

        const mediaDetails = await getTMDBDetails(imdbId);
        if (!mediaDetails) {
            return res.json({ streams: [] });
        }

        // Fetch magnets
        const aggregator = new ScraperAggregator();
        const allStreams = await aggregator.fetchAllStreams(type, imdbId, season, episode);

        if (allStreams.length === 0) {
            return res.json({ streams: [] });
        }

        // Sort
        const sortedStreams = smartSortStreams(allStreams);
        
        // Test in parallel
        const rd = new RealDebrid(HARDCODED_REALDEBRID_KEY);
        const results = await testStreamsInParallel(sortedStreams, rd, 12, season, episode);

        console.log(`\n🎉 Returning ${results.length} streams\n`);

        if (results.length === 0) {
            return res.json({
                streams: [{
                    name: `🚫 No Cached`,
                    title: `Tested ${Math.min(allStreams.length, 30)} torrents - none cached on RD`,
                    url: "",
                    behaviorHints: { notWebReady: true }
                }]
            });
        }

        // Build final stream objects with full metadata
        const finalStreams = results.map(r => {
            const streamName = [
                `⚡ ${r.qualitySymbol}`,
                r.quality,
                r.fileSize,
                r.stream.scraperSource
            ].filter(Boolean).join(' | ');

            const titleLines = [
                `🎬 ${mediaDetails.title}${mediaDetails.year ? ` (${mediaDetails.year})` : ''}`,
                type === 'series' ? `S${season}E${episode}` : '',
                ``,
                `📺 ${r.quality}`,
                `💾 ${r.fileSize}`,
                `🌱 ${r.stream.scraperSource}`,
                ``,
                `📁 ${r.result.filename.split('/').pop()}`,
                ``,
                `⚡ Real-Debrid Cached`
            ].filter(Boolean);

            return {
                name: streamName,
                title: titleLines.join('\n'),
                url: r.result.url
            };
        });

        res.json({ streams: finalStreams });

    } catch (error) {
        console.error('❌ Error:', error);
        res.json({
            streams: [{
                name: "❌ Error",
                title: error.message,
                url: "",
                behaviorHints: { notWebReady: true }
            }]
        });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        addon: 'RD Multi-Scraper Optimized',
        version: '5.0.0',
        method: 'Proper RD cache detection pattern'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 RD Multi-Scraper running on port ${PORT}`);
    console.log(`📍 Manifest: http://localhost:${PORT}/manifest.json`);
});
