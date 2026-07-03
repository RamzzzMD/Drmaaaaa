const express = require('express');
const path = require('path');
const app = express();

// Konfigurasi Path Absolut (Sangat Penting untuk Vercel Serverless)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const API_BASE = 'https://melolo-api-azure.vercel.app/api/melolo';

// Helper Function: Universal Fetcher
async function fetchAPI(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        return await response.json();
    } catch (error) {
        console.error(`Fetch Error [${endpoint}]:`, error);
        return null;
    }
}

// 1. Halaman Beranda (Latest & Trending)
app.get('/', async (req, res) => {
    const [latestRes, trendingRes] = await Promise.all([
        fetchAPI('/latest'),
        fetchAPI('/trending')
    ]);

    const latestBooks = latestRes?.books || [];
    const trendingBooks = trendingRes?.books || [];

    res.render('index', { latestBooks, trendingBooks });
});

// 2. Halaman Pencarian
app.get('/search', async (req, res) => {
    const keyword = req.query.keyword || '';
    let searchResults = [];

    if (keyword) {
        const searchRes = await fetchAPI(`/search?query=${encodeURIComponent(keyword)}&limit=20&offset=0`);
        if (searchRes?.data?.search_data?.[0]?.books) {
            searchResults = searchRes.data.search_data[0].books;
        }
    }

    res.render('search', { keyword, searchResults });
});

// 3. Halaman Detail Drama
app.get('/detail/:book_id', async (req, res) => {
    const detailRes = await fetchAPI(`/detail/${req.params.book_id}`);
    const drama = detailRes?.data?.video_data || {};
    
    res.render('detail', { drama });
});

// 4. Halaman Video Player
app.get('/play/:vid_id', async (req, res) => {
    const streamRes = await fetchAPI(`/stream/${req.params.vid_id}`);
    let videoBase64Url = '';

    if (streamRes?.data?.video_model) {
        try {
            const videoModelObj = JSON.parse(streamRes.data.video_model);
            const videoList = videoModelObj.video_list || {};
            // Prioritas 720p (video_5) atau 360p (video_2)
            const targetVideo = videoList.video_5 || videoList.video_2 || Object.values(videoList)[0];
            
            if (targetVideo && targetVideo.main_url) {
                videoBase64Url = targetVideo.main_url;
            }
        } catch (error) {
            console.error("Gagal parse video_model JSON:", error);
        }
    }

    res.render('player', { videoBase64Url, vidId: req.params.vid_id });
});

// Wajib untuk Vercel: Export app sebagai module
module.exports = app;

// Fallback jika dijalankan di lokal (node server.js)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}
