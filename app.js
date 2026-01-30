document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const bgVideo = document.getElementById('bg-video');
    const songListContainer = document.getElementById('song-list');
    const playlistListContainer = document.getElementById('playlist-list');
    const audioPlayer = new Audio();
    audioPlayer.preload = 'metadata';
    
    // Mini Player
    const playBtn = document.getElementById('play-btn');
    const playIcon = playBtn.querySelector('i');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const seekBar = document.getElementById('seek-bar');
    const volumeBar = document.getElementById('volume-bar');
    const likeBtn = document.getElementById('like-btn');
    const expandBtn = document.getElementById('expand-btn');
    const miniPlayerInfo = document.getElementById('mini-player-info');
    const headerPlayBtn = document.getElementById('header-play-btn');
    const headerShuffleBtn = document.getElementById('header-shuffle-btn');

    // Info Display
    const currentTitle = document.getElementById('current-title');
    const currentArtist = document.getElementById('current-artist');
    const currentTimeEl = document.getElementById('current-time');
    const totalDurationEl = document.getElementById('total-duration');

    // Full Screen Player
    const fsPlayer = document.getElementById('full-screen-player');
    const closeFsBtn = document.getElementById('close-fs-btn');
    // const fsDisc = document.getElementById('fs-disc'); // Removed
    const fsTitle = document.getElementById('fs-title');
    const fsArtist = document.getElementById('fs-artist');
    const fsPlayBtn = document.getElementById('fs-play-btn');
    const fsPlayIcon = fsPlayBtn.querySelector('i');
    const fsNextBtn = document.getElementById('fs-next-btn');
    const fsPrevBtn = document.getElementById('fs-prev-btn');
    const fsShuffleBtn = document.getElementById('fs-shuffle-btn');
    const fsRepeatBtn = document.getElementById('fs-repeat-btn');
    
    const fsLikeBtn = document.getElementById('fs-like-btn');
    const fsAddPlBtn = document.getElementById('fs-add-pl-btn');
    const fsSeekBar = document.getElementById('fs-seek-bar');
    const fsVolumeBar = document.getElementById('fs-volume-bar');
    const fsCurrentTime = document.getElementById('fs-current-time');
    const fsTotalDuration = document.getElementById('fs-total-duration');

    const fsQueueList = document.getElementById('fs-queue-list');
    
    // Add to Playlist Modal Specifics
    const addToPlaylistModal = document.getElementById('add-to-playlist-modal');
    const modalPlaylistList = document.getElementById('modal-playlist-list');
    const closeAddPl = document.getElementById('close-add-pl');
    let songToAdd = null; // Track which song to add

    // Navigation & Modals
    const navHome = document.getElementById('nav-home');
    const navLiked = document.getElementById('nav-liked');
    const viewTitle = document.getElementById('view-title');
    const createPlaylistBtn = document.getElementById('create-playlist-btn');
    const createPlaylistModal = document.getElementById('create-playlist-modal');
    const newPlaylistNameInput = document.getElementById('new-playlist-name');
    const confirmCreatePl = document.getElementById('confirm-create-pl');
    const cancelCreatePl = document.getElementById('cancel-create-pl');
    
    const songSearch = document.getElementById('song-search');
    
    // Sidebar Mobile
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar'); // Use class since no ID was seen in previous view_file for sidebar div, wait, index.html might not have id="sidebar". Correcting to querySelector or adding ID. Let's use class for safety or add ID.
    // Actually, I saw <div class="sidebar"> in index.html diff. It didn't have ID.
    // I will use querySelector('.sidebar') to be safe.
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // --- State ---
    let allSongs = []; // Master list from server
    let currentPlaylist = []; // Currently playing list
    let currentSongIndex = 0;
    
    let isPlaying = false;
    let isShuffle = false;
    let isRepeat = false;
    
    let videos = [];
    
    // Persistent State
    let userPlaylists = JSON.parse(localStorage.getItem('music_vibes_playlists')) || {};
    let likedSongs = JSON.parse(localStorage.getItem('music_vibes_likes')) || [];

    // --- Initialization ---
    fetchVideos();
    fetchSongs();
    renderPlaylists();

    // --- Fetch Functions ---

    function fetchVideos() {
        fetch('/api/video')
            .then(res => {
                if (!res.ok) throw new Error('API Fail');
                return res.json();
            })
            .then(data => {
                if (data && data.length > 0) {
                    videos = data;
                    changeBackground();
                }
            })
            .catch(err => {
                console.warn('API video fail, trying static json');
                fetch('video.json')
                    .then(res => res.json())
                    .then(data => {
                        videos = data;
                        changeBackground();
                    })
                    .catch(e => console.error('Final video fetch fail:', e));
            });
    }

    function changeBackground() {
        if (videos.length > 0) {
            const randomVideo = videos[Math.floor(Math.random() * videos.length)];
            // Avoid reloading same video if possible
            if (bgVideo.getAttribute('src') !== randomVideo || videos.length === 1) {
                 bgVideo.src = randomVideo;
            } else {
                 changeBackground();
            }
        }
    }

    function fetchSongs() {
        fetch('/api/songs')
            .then(res => {
                if (!res.ok) throw new Error('API Fail');
                return res.json();
            })
            .then(data => handleSongsData(data))
            .catch(err => {
                console.warn('API songs fail, trying static json');
                fetch('music.json')
                    .then(res => res.json())
                    .then(data => handleSongsData(data))
                    .catch(e => {
                        console.error('Final songs fetch fail:', e);
                        songListContainer.innerHTML = '<div style="padding:20px;">Error loading songs.</div>';
                    });
            });
    }

    function handleSongsData(data) {
        allSongs = data.map(song => ({
            ...song,
            name: song.name.replace(/\.(mp3|wav|ogg|m4a|webm)$/i, '')
        }));
        // Default view: All Songs
        loadView('home');
        
        // Initialize bars with correct fill
        updateBarProgress(volumeBar);
        updateBarProgress(fsVolumeBar);
    }

    // State for View Management
    let activeView = 'home';
    let activePlaylistName = null;

    // --- View Management ---

    function loadView(viewType, playlistName = null) {
        songListContainer.innerHTML = '';
        activeView = viewType;
        activePlaylistName = playlistName;
        
        // Clear search if loading a standard view
        if (viewType !== 'search') {
            songSearch.value = '';
        }

        if (viewType === 'home') {
            currentPlaylist = [...allSongs]; // Copy all songs
            viewTitle.textContent = 'All Songs';
            navHome.classList.add('active');
            navLiked.classList.remove('active');
        } else if (viewType === 'liked') {
            currentPlaylist = allSongs.filter(s => likedSongs.includes(s.name));
            viewTitle.textContent = 'Liked Songs';
            navHome.classList.remove('active');
            navLiked.classList.add('active');
        } else if (viewType === 'playlist') {
            const playlistSongNames = userPlaylists[playlistName] || [];
            currentPlaylist = allSongs.filter(s => playlistSongNames.includes(s.name));
            viewTitle.textContent = playlistName;
            navHome.classList.remove('active');
            navLiked.classList.remove('active');
        }

        renderSongList();
        
        // Show/Hide Play Button based on songs in currentPlaylist
        if (currentPlaylist.length > 0) {
            headerPlayBtn.classList.add('show');
            headerShuffleBtn.classList.add('show');
            // If the current playing song is in THIS view, show pause icon if playing
            updateHeaderPlayButtonIcon();
        } else {
            headerPlayBtn.classList.remove('show');
            headerShuffleBtn.classList.remove('show');
        }

        // If nothing playing yet and songs exist, set up first song without playing
        if (!audioPlayer.src && currentPlaylist.length > 0) {
            const firstPlayableIndex = currentPlaylist.findIndex(isPlayable);
            if (firstPlayableIndex >= 0) {
                loadSong(firstPlayableIndex, false);
            }
        }
    }

    function updateHeaderPlayButtonIcon() {
        const icon = headerPlayBtn.querySelector('i');
        const isCurrentlyPlayingThisView = currentPlaylist.some(s => audioPlayer.src.includes(encodeURI(s.name)));
        
        if (isCurrentlyPlayingThisView && isPlaying) {
            icon.className = 'fas fa-pause';
        } else {
            icon.className = 'fas fa-play';
        }
    }

    function renderSongList() {
        songListContainer.innerHTML = '';
        if (currentPlaylist.length === 0) {
            songListContainer.innerHTML = '<div style="padding:20px; opacity: 0.7;">No songs here yet.</div>';
            return;
        }

        currentPlaylist.forEach((song, index) => {
            const isLiked = likedSongs.includes(song.name);
            const div = document.createElement('div');
            // Check if this song is currently the one loaded in player
            // Note: simple check by name as index might differ between views
            const isCurrentPlaying = (audioPlayer.src.includes(encodeURI(song.name)) || (currentTitle.textContent === song.name));
            
            div.className = `song-item ${isCurrentPlaying ? 'active' : ''}`;
            
            // Determine Action Button (Remove if in Playlist view, Add otherwise)
            let actionBtnHtml = `
                <button class="add-pl-btn-list" style="border:none; background:none; color:#b3b3b3; cursor:pointer; margin-right:10px;">
                    <i class="fas fa-plus"></i>
                </button>
            `;
            if (activeView === 'playlist') {
                 actionBtnHtml = `
                    <button class="remove-pl-song-btn" style="border:none; background:none; color:#b3b3b3; cursor:pointer; margin-right:10px;" title="Remove from Playlist">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }

            div.innerHTML = `
                <div class="play-icon"><i class="${isCurrentPlaying && isPlaying ? 'fas fa-pause' : 'fas fa-play'}"></i></div>
                <div class="song-details">
                    <span class="song-name">${song.name}</span>
                    <span class="song-artist">${song.artist}</span>
                </div>
                <!-- Action Buttons -->
                ${actionBtnHtml}
                <button class="like-btn-list ${isLiked ? 'active' : ''}" style="border:none; background:none; color: ${isLiked ? '#1DB954' : '#b3b3b3'}; cursor:pointer;">
                    <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                </button>
            `;
            
            // Click on item -> Play
            div.addEventListener('click', (e) => {
                if (e.target.closest('button')) return; // Don't play if clicked buttons
                playSong(index);
            });

            // Click on Like
            const likeBtnList = div.querySelector('.like-btn-list');
            likeBtnList.addEventListener('click', () => {
                toggleLike(song.name);
                const wasLiked = likedSongs.includes(song.name);
                likeBtnList.classList.toggle('active', wasLiked);
                likeBtnList.style.color = wasLiked ? '#1DB954' : '#b3b3b3';
                likeBtnList.querySelector('i').className = wasLiked ? 'fas fa-heart' : 'far fa-heart';
            });
            
            // Action Button Logic
            if (activeView === 'playlist') {
                const removeBtn = div.querySelector('.remove-pl-song-btn');
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Remove "${song.name}" from ${activePlaylistName}?`)) {
                        removeFromPlaylist(activePlaylistName, song.name);
                    }
                });
            } else {
                const addPlBtnList = div.querySelector('.add-pl-btn-list');
                addPlBtnList.addEventListener('click', () => {
                    songToAdd = song.name;
                    renderAddToPlaylistModal();
                    addToPlaylistModal.classList.remove('hidden');
                });
            }

            songListContainer.appendChild(div);

            // Scroll into view if active
            if (isCurrentPlaying) {
                div.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    function renderQueue() {
        fsQueueList.innerHTML = '';
        // Show ENTIRE playlist in the queue for Spotify-like behavior
        const queueSongs = currentPlaylist;
        
        if (queueSongs.length === 0) {
            fsQueueList.innerHTML = '<div style="padding:10px; color:#666;">End of list.</div>';
            return;
        }

        queueSongs.forEach((song, i) => {
            const realIndex = i;
            const isCurrent = (realIndex === currentSongIndex);
            
            const li = document.createElement('li');
            li.className = `queue-item ${isCurrent ? 'active' : ''}`;
            li.innerHTML = `
                <i class="fas fa-bars" style="color:#666; margin-right:10px; cursor:grab;"></i>
                <div class="q-details">
                    <span class="q-title">${song.name}</span>
                    <span class="q-artist">${song.artist}</span>
                </div>
                <button class="q-remove"><i class="fas fa-times"></i></button>
            `;
            
            // Play song on click (details part)
            li.querySelector('.q-details').addEventListener('click', () => {
                playSong(realIndex);
            });
            
            // Remove functionality
            li.querySelector('.q-remove').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent play
                // Remove from currentPlaylist at realIndex
                currentPlaylist.splice(realIndex, 1);
                renderQueue(); // Re-render queue
                renderSongList(); // Update main list too
            });
            
            fsQueueList.appendChild(li);

            // Scroll into view if active
            if (isCurrent) {
                li.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    // --- Playlist & Like Logic ---

    function removeFromPlaylist(plyName, songName) {
         if (userPlaylists[plyName]) {
             userPlaylists[plyName] = userPlaylists[plyName].filter(s => s !== songName);
             localStorage.setItem('music_vibes_playlists', JSON.stringify(userPlaylists));
             loadView('playlist', plyName); // Refresh view
         }
    }

    function deletePlaylist(plyName) {
        if (confirm(`Delete playlist "${plyName}" forever?`)) {
            delete userPlaylists[plyName];
            localStorage.setItem('music_vibes_playlists', JSON.stringify(userPlaylists));
            renderPlaylists(); // Refresh sidebar
            if (activeView === 'playlist' && activePlaylistName === plyName) {
                loadView('home'); // Go home if we were viewing it
            }
        }
    }

    function renderPlaylists() {
        playlistListContainer.innerHTML = '';
        Object.keys(userPlaylists).forEach(name => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            
            const nameSpan = document.createElement('span');
            nameSpan.innerHTML = `<i class="fas fa-list"></i> ${name}`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.style.background = 'none';
            deleteBtn.style.border = 'none';
            deleteBtn.style.color = '#666';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.className = 'playlist-delete-btn';
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePlaylist(name);
            });
            
            li.appendChild(nameSpan);
            li.appendChild(deleteBtn);
            
            li.addEventListener('click', (e) => {
                if(e.target.closest('.playlist-delete-btn')) return;
                loadView('playlist', name);
            });
            playlistListContainer.appendChild(li);
        });
    }

    function renderAddToPlaylistModal() {
        modalPlaylistList.innerHTML = '';
        const names = Object.keys(userPlaylists);
        if (names.length === 0) {
            modalPlaylistList.innerHTML = '<li>No playlists created.</li>';
        }
        names.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            li.style.cursor = 'pointer';
            li.style.padding = '5px';
            li.addEventListener('click', () => {
                // Add song to this playlist
                if (!userPlaylists[name].includes(songToAdd)) {
                    userPlaylists[name].push(songToAdd);
                    localStorage.setItem('music_vibes_playlists', JSON.stringify(userPlaylists));
                    alert(`Added to ${name}`);
                } else {
                    alert('Song already in playlist');
                }
                addToPlaylistModal.classList.add('hidden');
            });
            modalPlaylistList.appendChild(li);
        });
    }

    function toggleLike(songName) {
        if (likedSongs.includes(songName)) {
            likedSongs = likedSongs.filter(n => n !== songName);
        } else {
            likedSongs.push(songName);
        }
        localStorage.setItem('music_vibes_likes', JSON.stringify(likedSongs));
        updateLikeButtonsState(songName);
    }

    function updateLikeButtonsState(songName) {
        // If checks current playing song
        if (currentTitle.textContent === songName) {
            const isLiked = likedSongs.includes(songName);
            // Mini player
            likeBtn.classList.toggle('active', isLiked);
            likeBtn.querySelector('i').className = isLiked ? 'fas fa-heart' : 'far fa-heart';
            // FS player
            fsLikeBtn.classList.toggle('active', isLiked);
            fsLikeBtn.querySelector('i').className = isLiked ? 'fas fa-heart' : 'far fa-heart';
        }
    }

    // --- Player Logic ---

    function loadSong(index, autoPlay = true) {
        if (index < 0 || index >= currentPlaylist.length) return;
        
        currentSongIndex = index;
        const song = currentPlaylist[index];
        
        // Update Audio
        audioPlayer.src = song.url;
        audioPlayer.load();
        
        // Update Info
        currentTitle.textContent = song.name;
        currentArtist.textContent = song.artist;
        fsTitle.textContent = song.name;
        fsArtist.textContent = song.artist;

        // Update Like Status
        updateLikeButtonsState(song.name);
        
        // Reset and update bars
        seekBar.value = 0;
        fsSeekBar.value = 0;
        updateBarProgress(seekBar);
        updateBarProgress(fsSeekBar);

        // Highlight in list
        // Re-render list to show active state
        renderSongList();
        renderQueue(); // Update queue view

        if (autoPlay) {
            audioPlayer.play();
            isPlaying = true;
            updatePlayButtons(true);
            updateDiscAnimation(true);
        } else {
            updateDiscAnimation(false);
        }
        
        // Sync header play button
        updateHeaderPlayButtonIcon();
        
        // Visuals
        if (videos.length > 0) changeBackground();
    }

    function playSong(index) {
        // Warning: index passed is relative to currentPlaylist
        if (!isPlayable(currentPlaylist[index])) {
            const nextPlayable = currentPlaylist.findIndex((s, i) => i >= index && isPlayable(s));
            if (nextPlayable >= 0) {
                loadSong(nextPlayable, true);
                return;
            }
        }
        if (currentSongIndex === index && isPlaying) {
            togglePlay();
        } else {
            loadSong(index, true);
        }
    }

    function updateDiscAnimation(playing) {
        // Toggle 'playing' class on the container of the album art to trigger RGB glow
        const nowPlayingContainer = document.querySelector('.fs-now-playing');
        if (nowPlayingContainer) { // Check if the element exists
            if (playing) {
                nowPlayingContainer.classList.add('playing');
            } else {
                nowPlayingContainer.classList.remove('playing');
            }
        }
    }

    function togglePlay() {
        if (isPlaying) {
            audioPlayer.pause();
        } else {
            audioPlayer.play();
        }
        isPlaying = !isPlaying;
        updatePlayButtons(isPlaying);
        updateDiscAnimation(isPlaying);
        renderSongList(); // update icons
    }

    function updatePlayButtons(playing) {
        const cls = playing ? 'fas fa-pause' : 'fas fa-play';
        playIcon.className = cls;
        fsPlayIcon.className = cls;
        updateHeaderPlayButtonIcon();
    }

    function nextSong() {
        // Shuffle logic
        let nextIndex;
        if (isShuffle) {
            nextIndex = Math.floor(Math.random() * currentPlaylist.length);
        } else {
            nextIndex = (currentSongIndex + 1) % currentPlaylist.length;
        }
        loadSong(nextIndex, true);
    }

    function prevSong() {
        let prevIndex = (currentSongIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        loadSong(prevIndex, true);
    }

    // --- Audio Events ---

    audioPlayer.addEventListener('timeupdate', () => {
        const { currentTime, duration } = audioPlayer;
        if (isNaN(duration)) return;
        
        const progressPercent = (currentTime / duration) * 100;
        seekBar.value = progressPercent;
        fsSeekBar.value = progressPercent;
        updateBarProgress(seekBar);
        updateBarProgress(fsSeekBar);
        
        const timeStr = formatTime(currentTime);
        const durStr = formatTime(duration);
        
        currentTimeEl.textContent = timeStr;
        totalDurationEl.textContent = durStr;
        fsCurrentTime.textContent = timeStr;
        fsTotalDuration.textContent = durStr;
    });

    audioPlayer.addEventListener('ended', () => {
        if (isRepeat) {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        } else {
            nextSong();
        }
    });

    // --- UI Events ---

    // Nav
    navHome.addEventListener('click', () => loadView('home'));
    navLiked.addEventListener('click', () => loadView('liked'));
    
    // Controls
    playBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', nextSong);
    prevBtn.addEventListener('click', prevSong);
    
    headerPlayBtn.addEventListener('click', () => {
        // If this playlist is already playing, togglePlay
        const isCurrentlyPlayingThisView = currentPlaylist.some(s => audioPlayer.src.includes(encodeURI(s.name)));
        if (isCurrentlyPlayingThisView) {
            togglePlay();
        } else {
            // Play from beginning
            playSong(0);
        }
    });

    headerShuffleBtn.addEventListener('click', () => {
        if (currentPlaylist.length > 0) {
            shufflePlaylist(currentPlaylist);
            // Play the first song of the shuffled list
            playSong(0);
        }
    });

    fsPlayBtn.addEventListener('click', togglePlay);
    fsNextBtn.addEventListener('click', nextSong);
    fsPrevBtn.addEventListener('click', prevSong);
    
    fsShuffleBtn.addEventListener('click', () => {
        isShuffle = !isShuffle;
        fsShuffleBtn.style.color = isShuffle ? '#1DB954' : '#b3b3b3';
        shuffleBtn.style.color = isShuffle ? '#1DB954' : '#b3b3b3';
    });
    shuffleBtn.addEventListener('click', () => {
        isShuffle = !isShuffle;
        fsShuffleBtn.style.color = isShuffle ? '#1DB954' : '#b3b3b3';
        shuffleBtn.style.color = isShuffle ? '#1DB954' : '#b3b3b3';
    });

    fsRepeatBtn.addEventListener('click', () => {
        isRepeat = !isRepeat;
        fsRepeatBtn.style.color = isRepeat ? '#1DB954' : '#b3b3b3';
        repeatBtn.style.color = isRepeat ? '#1DB954' : '#b3b3b3';
    });
    repeatBtn.addEventListener('click', () => {
        isRepeat = !isRepeat;
        fsRepeatBtn.style.color = isRepeat ? '#1DB954' : '#b3b3b3';
        repeatBtn.style.color = isRepeat ? '#1DB954' : '#b3b3b3';
    });

    // Like
    likeBtn.addEventListener('click', () => toggleLike(currentTitle.textContent));
    fsLikeBtn.addEventListener('click', () => toggleLike(fsTitle.textContent));

    // Full Screen
    expandBtn.addEventListener('click', () => fsPlayer.classList.remove('hidden'));
    miniPlayerInfo.addEventListener('click', () => fsPlayer.classList.remove('hidden')); 
    closeFsBtn.addEventListener('click', () => fsPlayer.classList.add('hidden'));

    // Seeking
    const seekHandler = (bar) => {
        const seekTime = (audioPlayer.duration / 100) * bar.value;
        audioPlayer.currentTime = seekTime;
    }
    seekBar.addEventListener('input', () => seekHandler(seekBar));
    fsSeekBar.addEventListener('input', () => seekHandler(fsSeekBar));
    
    // Volume
    const volumeHandler = (bar) => {
        audioPlayer.volume = bar.value / 100;
        volumeBar.value = bar.value;
        fsVolumeBar.value = bar.value;
        updateBarProgress(volumeBar);
        updateBarProgress(fsVolumeBar);
    }
    volumeBar.addEventListener('input', () => volumeHandler(volumeBar));
    fsVolumeBar.addEventListener('input', () => volumeHandler(fsVolumeBar));

    // Add to Playlist (FS)
    fsAddPlBtn.addEventListener('click', () => {
        songToAdd = currentTitle.textContent;
        renderAddToPlaylistModal();
        addToPlaylistModal.classList.remove('hidden');
    });

    closeAddPl.addEventListener('click', () => {
        addToPlaylistModal.classList.add('hidden');
    });

    // Create Playlist
    createPlaylistBtn.addEventListener('click', () => {
        createPlaylistModal.classList.remove('hidden');
        newPlaylistNameInput.focus();
    });

    cancelCreatePl.addEventListener('click', () => {
        createPlaylistModal.classList.add('hidden'); 
        newPlaylistNameInput.value = '';
    });

    confirmCreatePl.addEventListener('click', () => {
        const name = newPlaylistNameInput.value.trim();
        if (name) {
            if (!userPlaylists[name]) {
                userPlaylists[name] = [];
                localStorage.setItem('music_vibes_playlists', JSON.stringify(userPlaylists));
                renderPlaylists();
                createPlaylistModal.classList.add('hidden');
                newPlaylistNameInput.value = '';
            } else {
                alert('Playlist already exists!');
            }
        }
    });

    // Mobile Sidebar Events
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
             sidebar.classList.remove('active');
             sidebarOverlay.classList.remove('active');
        });
    }
    
    // Close sidebar when clicking a nav item (optional but good UX)
    const navItems = document.querySelectorAll('.sidebar nav li, .playlist-section li');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            }
        });
    });
    
    // --- Search Logic ---
    songSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query) {
            activeView = 'search';
            viewTitle.textContent = `Results for "${query}"`;
            navHome.classList.remove('active');
            navLiked.classList.remove('active');
            
            currentPlaylist = allSongs.filter(song => 
                song.name.toLowerCase().includes(query) || 
                song.artist.toLowerCase().includes(query)
            );
            renderSongList();
        } else {
            loadView('home');
        }
    });

    songSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (currentPlaylist.length > 0) {
                // If there's a search result, play the first one
                playSong(0);
                // Clear search or keep it? User said "that song will play automatically"
                // I'll keep the results but play the first one.
            }
        }
    });

    // --- Helper ---
    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    function updateBarProgress(bar) {
        const val = bar.value;
        const min = bar.min || 0;
        const max = bar.max || 100;
        const percent = ((val - min) / (max - min)) * 100;
        bar.style.setProperty('--progress', percent + '%');
    }

    function shufflePlaylist(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function isPlayable(song) {
        const url = song.url || '';
        if (url.toLowerCase().endsWith('.mp3')) {
            return !!audioPlayer.canPlayType('audio/mpeg');
        }
        if (url.toLowerCase().endsWith('.webm')) {
            return !!audioPlayer.canPlayType('audio/webm');
        }
        if (url.toLowerCase().endsWith('.ogg')) {
            return !!audioPlayer.canPlayType('audio/ogg');
        }
        if (url.toLowerCase().endsWith('.wav')) {
            return !!audioPlayer.canPlayType('audio/wav');
        }
        if (url.toLowerCase().endsWith('.m4a')) {
            return !!audioPlayer.canPlayType('audio/mp4');
        }
        return false;
    }

    // --- Welcome Screen Logic ---
    const welcomeScreen = document.getElementById('welcome-screen');
    const getStartedBtn = document.getElementById('get-started-btn');

    // Check if user has visited before
    const hasVisited = localStorage.getItem('music_vibes_visited');
    // const hasVisited = false; // Enabled for testing/demo purposes as per user feedback

    if (hasVisited) {
        // Hide immediately if already visited
        welcomeScreen.classList.add('hidden');
    } else {
        // Show welcome screen (it's visible by default in CSS, so just ensure content)
        // Add listener to dismiss
        getStartedBtn.addEventListener('click', () => {
            localStorage.setItem('music_vibes_visited', 'true');
            welcomeScreen.classList.add('hidden');
            
            // Optional: Start background video explicitly or audio context prompt
            // audioPlayer.load(); // Prepare audio logic if needed
        });
    }
});
