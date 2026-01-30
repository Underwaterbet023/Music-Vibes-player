const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

// Logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// API to get songs
app.get('/api/songs', (req, res) => {
    const musicDir = path.join(__dirname, 'music');
    fs.readdir(musicDir, (err, files) => {
        if (err) {
            console.error('Error reading music dir:', err);
            return res.status(500).json({ error: 'Unable to scan music directory' });
        }
        // Filter for audio files
        const supportedExts = ['.mp3', '.wav', '.ogg', '.m4a', '.webm'];
        const songs = files
            .filter(file => supportedExts.some(ext => file.toLowerCase().endsWith(ext)))
            .map(file => ({
                name: file,
                artist: 'Royalty Free',
                url: `/music/${file}`
            }));
        console.log(`Found ${songs.length} songs`);
        res.json(songs);
    });
});

// API to get video
app.get('/api/video', (req, res) => {
    const videoDir = path.join(__dirname, 'video');
    fs.readdir(videoDir, (err, files) => {
        if (err) {
            console.error('Error reading video dir:', err);
            return res.status(500).json({ error: 'Unable to scan video directory' });
        }
        // Filter for mp4 files
        const videos = files
            .filter(file => file.toLowerCase().endsWith('.mp4'))
            .map(file => `/video/${file}`);
            
        // Return random video or all
        res.json(videos);
    });
});

app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.use('/music', express.static(path.join(__dirname, 'music'), {
    setHeaders: (res, filePath) => {
        if (filePath.toLowerCase().endsWith('.webm')) {
            res.type('audio/webm');
        }
    }
}));
app.use('/video', express.static(path.join(__dirname, 'video')));

// Fallback for any other routes to load the SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

if (process.env.NODE_ENV !== 'production' || !process.env.FUNCTION_TARGET) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

const functions = require('firebase-functions');
exports.app = functions.https.onRequest(app);
