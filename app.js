/* Tchatz Music — lecteur local, sans service ni stockage distant. */
(() => {
  'use strict';

  const DB_NAME = 'tchatz-music-local';
  const DB_VERSION = 1;
  const PREFS_KEY = 'tchatz-music:preferences:v1';
  const MAX_HISTORY = 40;
  const MAX_IMPORT_ISSUES = 9;
  const FORMATS = {
    mp3: { mime: 'audio/mpeg', probes: ['audio/mpeg'] },
    wav: { mime: 'audio/wav', probes: ['audio/wav', 'audio/x-wav', 'audio/wave'] },
    ogg: { mime: 'audio/ogg', probes: ['audio/ogg', 'audio/ogg; codecs="vorbis"', 'audio/ogg; codecs="opus"'] },
    m4a: { mime: 'audio/mp4', probes: ['audio/mp4', 'audio/mp4; codecs="mp4a.40.2"'] },
    aac: { mime: 'audio/aac', probes: ['audio/aac', 'audio/mp4; codecs="mp4a.40.2"'] }
  };

  const ICONS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7-11-7Z" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM15 5h4v14h-4z" fill="currentColor" stroke="none"/></svg>',
    music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13M9 18a3 2.5 0 1 1-3-2.5c1.7 0 3 .9 3 2.5Zm11-2a3 2.5 0 1 1-3-2.5c1.7 0 3 .9 3 2.5Z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 5.1-8.8 11-8.8 11s-8.8-5.9-8.8-11A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 8.8 2.6Z"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h12M4 18h9"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.7 4.2 4.2-.7L20 7.5 16.5 4 4 16.5Z"/><path d="m14.8 5.7 3.5 3.5"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>',
    plusList: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10M4 11h9M4 16h5M17 13v8m-4-4h8"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    install: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 15v4h14v-4"/></svg>'
  };

  const dom = {
    audio: document.getElementById('audio'),
    filePicker: document.getElementById('filePicker'),
    connectionBadge: document.getElementById('connectionBadge'),
    connectionLabel: document.getElementById('connectionLabel'),
    homeHero: document.getElementById('homeHero'),
    homeStats: document.getElementById('homeStats'),
    homeSections: document.getElementById('homeSections'),
    librarySearch: document.getElementById('librarySearch'),
    librarySort: document.getElementById('librarySort'),
    libraryResults: document.getElementById('libraryResults'),
    libraryResultsCount: document.getElementById('libraryResultsCount'),
    clearSearchButton: document.getElementById('clearSearchButton'),
    librarySummary: document.getElementById('librarySummary'),
    playlistList: document.getElementById('playlistList'),
    playlistDetail: document.getElementById('playlistDetail'),
    miniPlayer: document.getElementById('miniPlayer'),
    miniArtwork: document.getElementById('miniArtwork'),
    miniTitle: document.getElementById('miniTitle'),
    miniArtist: document.getElementById('miniArtist'),
    miniPlayButton: document.getElementById('miniPlayButton'),
    miniProgress: document.getElementById('miniProgress'),
    playerDialog: document.getElementById('playerDialog'),
    playerArtwork: document.getElementById('playerArtwork'),
    playerTitle: document.getElementById('playerTitle'),
    playerArtist: document.getElementById('playerArtist'),
    playerFilename: document.getElementById('playerFilename'),
    playerFavoriteButton: document.getElementById('playerFavoriteButton'),
    mainPlayButton: document.getElementById('mainPlayButton'),
    seekRange: document.getElementById('seekRange'),
    elapsedTime: document.getElementById('elapsedTime'),
    totalTime: document.getElementById('totalTime'),
    shuffleButton: document.getElementById('shuffleButton'),
    repeatButton: document.getElementById('repeatButton'),
    repeatOneMark: document.getElementById('repeatOneMark'),
    playbackState: document.getElementById('playbackState'),
    volumeRange: document.getElementById('volumeRange'),
    playlistDialog: document.getElementById('playlistDialog'),
    playlistForm: document.getElementById('playlistForm'),
    playlistName: document.getElementById('playlistName'),
    playlistDialogHeading: document.getElementById('playlistDialogHeading'),
    playlistFormError: document.getElementById('playlistFormError'),
    addToPlaylistDialog: document.getElementById('addToPlaylistDialog'),
    addTrackName: document.getElementById('addTrackName'),
    playlistChoiceList: document.getElementById('playlistChoiceList'),
    importDialog: document.getElementById('importDialog'),
    importStatus: document.getElementById('importStatus'),
    importProgress: document.getElementById('importProgress'),
    importCounts: document.getElementById('importCounts'),
    importIssues: document.getElementById('importIssues'),
    importCloseButton: document.getElementById('importCloseButton'),
    storageMeterFill: document.getElementById('storageMeterFill'),
    storageUsage: document.getElementById('storageUsage'),
    storageQuota: document.getElementById('storageQuota'),
    storageNote: document.getElementById('storageNote'),
    persistStatus: document.getElementById('persistStatus'),
    installTopButton: document.getElementById('installTopButton'),
    installSettingsButton: document.getElementById('installSettingsButton'),
    installHelp: document.getElementById('installHelp'),
    toastRegion: document.getElementById('toastRegion')
  };

  const state = {
    dbPromise: null,
    dbHandle: null,
    tracks: [],
    playlists: [],
    libraryVisibleTracks: [],
    preferences: loadPreferences(),
    currentTrack: null,
    currentQueue: [],
    currentObjectUrl: null,
    currentArtworkUrl: null,
    pendingSeek: null,
    currentView: 'home',
    selectedPlaylistId: null,
    editingPlaylistId: null,
    addingTrackId: null,
    pendingPlaylistTrackId: null,
    importBusy: false,
    deferredInstallPrompt: null,
    seeking: false,
    lastPositionWrite: 0
  };

  function defaultPreferences() {
    return {
      favorites: [],
      history: [],
      lastTrackId: null,
      lastPosition: 0,
      volume: 0.8,
      shuffle: false,
      repeat: 'off',
      librarySort: 'recent',
      libraryFilter: 'all'
    };
  }

  function loadPreferences() {
    const defaults = defaultPreferences();
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return defaults;
      const saved = JSON.parse(raw);
      return {
        ...defaults,
        ...saved,
        favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
        history: Array.isArray(saved.history) ? saved.history : [],
        volume: Number.isFinite(Number(saved.volume)) ? Math.max(0, Math.min(1, Number(saved.volume))) : defaults.volume,
        shuffle: Boolean(saved.shuffle),
        repeat: ['off', 'all', 'one'].includes(saved.repeat) ? saved.repeat : 'off',
        librarySort: saved.librarySort === 'title' ? 'title' : 'recent',
        libraryFilter: saved.libraryFilter === 'favorites' ? 'favorites' : 'all',
        lastPosition: Number.isFinite(Number(saved.lastPosition)) ? Math.max(0, Number(saved.lastPosition)) : 0
      };
    } catch (error) {
      return defaults;
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(state.preferences));
    } catch (error) {
      showToast('Les préférences n’ont pas pu être enregistrées par ce navigateur.', true);
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function icon(name) { return ICONS[name] || ''; }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return `tm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
  }

  function openDatabase() {
    if (state.dbPromise) return state.dbPromise;
    state.dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB n’est pas disponible dans ce navigateur.'));
        state.dbPromise = null;
        return;
      }
      let request;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (error) {
        reject(error);
        state.dbPromise = null;
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('tracks')) db.createObjectStore('tracks', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('playlists')) db.createObjectStore('playlists', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        state.dbHandle = request.result;
        state.dbHandle.onversionchange = () => state.dbHandle && state.dbHandle.close();
        resolve(state.dbHandle);
      };
      request.onerror = () => {
        state.dbPromise = null;
        reject(request.error || new Error('Impossible d’ouvrir la bibliothèque locale.'));
      };
      request.onblocked = () => {
        state.dbPromise = null;
        reject(new Error('La base locale est ouverte dans un autre onglet. Ferme cet onglet puis réessaie.'));
      };
    });
    return state.dbPromise;
  }

  function idbRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Erreur de stockage local.'));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('La transaction locale a échoué.'));
      transaction.onabort = () => reject(transaction.error || new Error('La transaction locale a été interrompue.'));
    });
  }

  async function getAllRecords(storeName) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readonly');
    const resultPromise = idbRequest(transaction.objectStore(storeName).getAll());
    const donePromise = transactionDone(transaction);
    const [records] = await Promise.all([resultPromise, donePromise]);
    return records || [];
  }

  async function getRecord(storeName, id) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readonly');
    const resultPromise = idbRequest(transaction.objectStore(storeName).get(id));
    const donePromise = transactionDone(transaction);
    const [record] = await Promise.all([resultPromise, donePromise]);
    return record;
  }

  async function putRecord(storeName, record) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const resultPromise = idbRequest(transaction.objectStore(storeName).put(record));
    const donePromise = transactionDone(transaction);
    await Promise.all([resultPromise, donePromise]);
    return record;
  }

  async function deleteRecord(storeName, id) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const resultPromise = idbRequest(transaction.objectStore(storeName).delete(id));
    const donePromise = transactionDone(transaction);
    await Promise.all([resultPromise, donePromise]);
  }

  async function clearLocalStores() {
    const db = await openDatabase();
    const transaction = db.transaction(['tracks', 'playlists'], 'readwrite');
    transaction.objectStore('tracks').clear();
    transaction.objectStore('playlists').clear();
    await transactionDone(transaction);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const value = Math.floor(seconds);
    const minutes = Math.floor(value / 60);
    const remaining = value % 60;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
    }
    return `${minutes}:${String(remaining).padStart(2, '0')}`;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return 'Indisponible';
    if (bytes < 1024) return `${Math.round(bytes)} o`;
    const units = ['Ko', 'Mo', 'Go', 'To'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function fileTitle(fileName) {
    const withoutExtension = String(fileName || '').replace(/\.[^.]+$/, '');
    return withoutExtension.trim() || 'Morceau sans titre';
  }

  function getExtension(fileName) {
    const match = String(fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
  }

  function getFingerprint(file) {
    return `${String(file.name || '').trim().toLocaleLowerCase('fr')}|${Number(file.size) || 0}|${Number(file.lastModified) || 0}`;
  }

  function isFormatPlayable(format) {
    if (!dom.audio || typeof dom.audio.canPlayType !== 'function') return true;
    return format.probes.some((type) => {
      try { return dom.audio.canPlayType(type) !== ''; } catch (error) { return false; }
    });
  }

  function decodeId3Text(bytes, encoding) {
    if (!bytes || !bytes.length) return '';
    try {
      if (encoding === 1) {
        if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2)).replace(/\0/g, '').trim();
        if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2)).replace(/\0/g, '').trim();
        return new TextDecoder('utf-16le').decode(bytes).replace(/\0/g, '').trim();
      }
      if (encoding === 2) return new TextDecoder('utf-16be').decode(bytes).replace(/\0/g, '').trim();
      if (encoding === 3) return new TextDecoder('utf-8').decode(bytes).replace(/\0/g, '').trim();
      return new TextDecoder('windows-1252').decode(bytes).replace(/\0/g, '').trim();
    } catch (error) {
      return '';
    }
  }

  function syncSafeInteger(bytes, offset) {
    return ((bytes[offset] & 0x7f) << 21) | ((bytes[offset + 1] & 0x7f) << 14) | ((bytes[offset + 2] & 0x7f) << 7) | (bytes[offset + 3] & 0x7f);
  }

  function parseApic(frameBytes) {
    if (frameBytes.length < 8) return null;
    const encoding = frameBytes[0];
    let cursor = 1;
    while (cursor < frameBytes.length && frameBytes[cursor] !== 0) cursor += 1;
    const mime = decodeId3Text(frameBytes.subarray(1, cursor), 0).toLowerCase();
    cursor += 1;
    if (cursor >= frameBytes.length) return null;
    cursor += 1; // picture type
    if (encoding === 1 || encoding === 2) {
      while (cursor + 1 < frameBytes.length && !(frameBytes[cursor] === 0 && frameBytes[cursor + 1] === 0)) cursor += 2;
      cursor += 2;
    } else {
      while (cursor < frameBytes.length && frameBytes[cursor] !== 0) cursor += 1;
      cursor += 1;
    }
    if (cursor >= frameBytes.length) return null;
    const imageBytes = frameBytes.slice(cursor);
    if (!imageBytes.length || imageBytes.length > 6 * 1024 * 1024) return null;
    const safeMime = /^image\/(jpeg|png|webp|gif)$/i.test(mime) ? mime : 'image/jpeg';
    return new Blob([imageBytes], { type: safeMime });
  }

  async function readId3Metadata(file, extension) {
    const metadata = { title: '', artist: '', album: '', artwork: null };
    if (extension !== 'mp3' || !file.size) return metadata;
    try {
      const headLimit = Math.min(file.size, 5 * 1024 * 1024);
      const head = new Uint8Array(await file.slice(0, headLimit).arrayBuffer());
      if (head.length >= 10 && head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
        const version = head[3];
        const tagSize = syncSafeInteger(head, 6);
        const end = Math.min(head.length, 10 + tagSize);
        let offset = 10;
        while (offset + (version === 2 ? 6 : 10) <= end) {
          const frameHeaderSize = version === 2 ? 6 : 10;
          const frameId = String.fromCharCode(...head.subarray(offset, offset + (version === 2 ? 3 : 4)));
          if (!frameId || /^\0+$/.test(frameId)) break;
          let frameSize;
          let frameName = frameId;
          if (version === 2) {
            frameSize = (head[offset + 3] << 16) | (head[offset + 4] << 8) | head[offset + 5];
            frameName = ({ TIT: 'TIT2', TP1: 'TPE1', TAL: 'TALB', PIC: 'APIC' })[frameId] || frameId;
          } else if (version === 4) {
            frameSize = syncSafeInteger(head, offset + 4);
          } else {
            frameSize = (head[offset + 4] * 0x1000000) + (head[offset + 5] << 16) + (head[offset + 6] << 8) + head[offset + 7];
          }
          const bodyStart = offset + frameHeaderSize;
          const bodyEnd = bodyStart + frameSize;
          if (!frameSize || bodyEnd > end) break;
          const body = head.subarray(bodyStart, bodyEnd);
          if (frameName[0] === 'T' && body.length > 1) {
            const text = decodeId3Text(body.subarray(1), body[0]);
            if (frameName === 'TIT2' && text) metadata.title = text;
            if (frameName === 'TPE1' && text) metadata.artist = text;
            if (frameName === 'TALB' && text) metadata.album = text;
          } else if ((frameName === 'APIC' || frameName === 'PIC') && !metadata.artwork) {
            metadata.artwork = parseApic(body);
          }
          offset = bodyEnd;
        }
      }
      if (!metadata.title || !metadata.artist || !metadata.album) {
        const tail = new Uint8Array(await file.slice(Math.max(0, file.size - 128), file.size).arrayBuffer());
        if (tail.length === 128 && tail[0] === 0x54 && tail[1] === 0x41 && tail[2] === 0x47) {
          if (!metadata.title) metadata.title = decodeId3Text(tail.subarray(3, 33), 0);
          if (!metadata.artist) metadata.artist = decodeId3Text(tail.subarray(33, 63), 0);
          if (!metadata.album) metadata.album = decodeId3Text(tail.subarray(63, 93), 0);
        }
      }
    } catch (error) {
      // Une balise mal formée n'empêche pas l'import du fichier.
    }
    return metadata;
  }

  function readDuration(file) {
    if (typeof Audio === 'undefined' || typeof URL.createObjectURL !== 'function') return Promise.resolve(null);
    return new Promise((resolve) => {
      let settled = false;
      let objectUrl;
      let probe;
      const finish = (duration) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (probe) {
          probe.onloadedmetadata = null;
          probe.onerror = null;
          try { probe.removeAttribute('src'); probe.load(); } catch (error) { /* navigateur */ }
        }
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(Number.isFinite(duration) && duration > 0 ? duration : null);
      };
      const timer = setTimeout(() => finish(null), 2200);
      try {
        objectUrl = URL.createObjectURL(file);
        probe = new Audio();
        probe.preload = 'metadata';
        probe.onloadedmetadata = () => finish(probe.duration);
        probe.onerror = () => finish(null);
        probe.src = objectUrl;
        probe.load();
      } catch (error) {
        finish(null);
      }
    });
  }

  function showToast(message, isError = false) {
    if (!dom.toastRegion) return;
    const toast = document.createElement('div');
    toast.className = `toast${isError ? ' is-error' : ''}`;
    toast.setAttribute('role', isError ? 'alert' : 'status');
    toast.textContent = message;
    dom.toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  function getTrack(trackId) {
    return state.tracks.find((track) => track.id === trackId) || null;
  }

  function getPlaylist(playlistId) {
    return state.playlists.find((playlist) => playlist.id === playlistId) || null;
  }

  function favoriteIds() {
    const valid = new Set(state.tracks.map((track) => track.id));
    return state.preferences.favorites.filter((id) => valid.has(id));
  }

  function historyTracks() {
    const byId = new Map(state.tracks.map((track) => [track.id, track]));
    return state.preferences.history.map((id) => byId.get(id)).filter(Boolean);
  }

  function recentAddedTracks(limit = 8) {
    return [...state.tracks].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, limit);
  }

  function makeEmptyInline(message, actionLabel = '', action = 'import') {
    return `<div class="empty-inline"><span class="empty-inline-icon">${icon('music')}</span><span>${escapeHtml(message)}${actionLabel ? ` <button class="text-button" type="button" data-action="${escapeHtml(action)}">${escapeHtml(actionLabel)}</button>` : ''}</span></div>`;
  }

  function makeHeroArt() {
    return `<div class="hero-art" aria-hidden="true">${icon('music')}</div>`;
  }

  function renderHome() {
    const hasTracks = state.tracks.length > 0;
    const greeting = (() => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Bonjour';
      if (hour < 18) return 'Bon après-midi';
      return 'Bonsoir';
    })();
    if (!hasTracks) {
      dom.homeHero.className = 'hero hero-empty';
      dom.homeHero.innerHTML = `
        <div class="hero-copy">
          <p class="eyebrow">${greeting.toUpperCase()} · BIENVENUE</p>
          <h1 id="homeHeading">Ton espace musical commence ici.</h1>
          <p>Importe les fichiers audio que tu choisis depuis ton téléphone. Ils resteront dans le stockage local de ce navigateur, sans être envoyés sur Internet.</p>
          <div class="hero-actions"><button class="button button-primary" type="button" data-action="import">${icon('install')}Importer ma musique</button></div>
          <p class="hero-note"><span class="privacy-dot"></span>Le navigateur ne parcourt pas automatiquement le stockage du téléphone.</p>
        </div>${makeHeroArt()}`;
    } else {
      dom.homeHero.className = 'hero';
      dom.homeHero.innerHTML = `
        <div class="hero-copy">
          <p class="eyebrow">${greeting.toUpperCase()} · TON ESPACE MUSICAL</p>
          <h1 id="homeHeading">Ta musique, à portée de main.</h1>
          <p>Retrouve tes morceaux importés, tes favoris et tes playlists. Ta bibliothèque reste sur cet appareil.</p>
          <div class="hero-actions"><button class="button button-primary" type="button" data-action="import">${icon('install')}Importer des morceaux</button><button class="button button-outline" type="button" data-action="navigate" data-view="library">Ouvrir ma bibliothèque</button></div>
        </div>${makeHeroArt()}`;
    }

    const favorites = favoriteIds();
    const recent = historyTracks();
    const stats = [
      { count: state.tracks.length, label: state.tracks.length === 1 ? 'morceau importé' : 'morceaux importés', icon: 'music' },
      { count: state.playlists.length, label: state.playlists.length === 1 ? 'playlist' : 'playlists', icon: 'list' },
      { count: favorites.length, label: favorites.length === 1 ? 'favori' : 'favoris', icon: 'heart' },
      { count: recent.length, label: recent.length === 1 ? 'écouté récemment' : 'écoutés récemment', icon: 'play' }
    ];
    dom.homeStats.innerHTML = stats.map((item) => `<article class="stat-card"><div><strong>${item.count}</strong><span>${escapeHtml(item.label)}</span></div><span class="stat-icon">${icon(item.icon)}</span></article>`).join('');

    const blocks = [
      { title: 'Récemment écoutés', sub: 'Reprends là où tu en étais.', tracks: recent.slice(0, 4), scope: 'recent', empty: 'Les morceaux que tu lanceras apparaîtront ici.' },
      { title: 'Ajoutés récemment', sub: 'Les derniers fichiers importés.', tracks: recentAddedTracks(4), scope: 'added', empty: 'Importe tes premiers fichiers audio pour remplir cette section.' },
      { title: 'Tes favoris', sub: 'Les morceaux que tu as marqués.', tracks: favorites.map(getTrack).filter(Boolean).slice(0, 4), scope: 'favorites', empty: 'Ajoute un morceau aux favoris depuis la bibliothèque.' }
    ];
    dom.homeSections.innerHTML = blocks.map((block) => {
      const contents = block.tracks.length ? `<div class="track-card-strip">${block.tracks.map((track) => `
        <article class="home-track-card">
          <button class="home-track-play" type="button" data-action="play-track" data-track-id="${escapeHtml(track.id)}" data-scope="${block.scope}" aria-label="Lire ${escapeHtml(track.title || fileTitle(track.fileName))}">
            <span class="artwork artwork-small" aria-hidden="true">${icon('music')}</span>
            <span class="home-track-info"><strong>${escapeHtml(track.title || fileTitle(track.fileName))}</strong><span>${escapeHtml(track.artist || track.fileName || 'Fichier audio local')}</span></span>
          </button>
          <div class="home-card-foot"><span>${track.duration ? formatTime(track.duration) : 'Durée inconnue'}</span><button class="text-button" type="button" data-action="toggle-favorite" data-track-id="${escapeHtml(track.id)}" aria-label="${favoriteIds().includes(track.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${favoriteIds().includes(track.id) ? 'Favori' : 'Ajouter aux favoris'}</button></div>
        </article>`).join('')}</div>` : makeEmptyInline(block.empty, block.title === 'Ajoutés récemment' && !hasTracks ? 'Importer ma musique' : '', 'import');
      return `<section class="section-block"><div class="section-heading"><div><h2>${escapeHtml(block.title)}</h2><p>${escapeHtml(block.sub)}</p></div>${block.tracks.length ? `<button class="text-button" type="button" data-action="navigate" data-view="${block.scope === 'favorites' ? 'library' : 'library'}">Voir ma musique ${icon('arrow')}</button>` : ''}</div>${contents}</section>`;
    }).join('');
  }

  function isFavorite(trackId) {
    return state.preferences.favorites.includes(trackId);
  }

  function getSortedLibraryTracks() {
    let tracks = [...state.tracks];
    if (state.preferences.libraryFilter === 'favorites') tracks = tracks.filter((track) => isFavorite(track.id));
    const query = (dom.librarySearch.value || '').trim().toLocaleLowerCase('fr');
    if (query) {
      tracks = tracks.filter((track) => [track.title, track.artist, track.album, track.fileName].some((value) => String(value || '').toLocaleLowerCase('fr').includes(query)));
    }
    if (state.preferences.librarySort === 'title') {
      tracks.sort((a, b) => (a.title || fileTitle(a.fileName)).localeCompare((b.title || fileTitle(b.fileName)), 'fr', { sensitivity: 'base', numeric: true }));
    } else {
      tracks.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    }
    return tracks;
  }

  function trackRowMarkup(track, scope = 'library', playlistId = '') {
    const title = track.title || fileTitle(track.fileName);
    const subtitle = track.artist || (track.album ? `Album · ${track.album}` : 'Fichier audio local');
    const currentClass = state.currentTrack && state.currentTrack.id === track.id ? ' is-current' : '';
    const favClass = isFavorite(track.id) ? ' is-favorite' : '';
    const removeFromPlaylist = playlistId ? `<button type="button" data-action="remove-from-playlist" data-track-id="${escapeHtml(track.id)}" data-playlist-id="${escapeHtml(playlistId)}">${icon('trash')}Retirer de cette playlist</button>` : '';
    return `<article class="track-row${currentClass}" data-track-row="${escapeHtml(track.id)}">
      <button class="track-main" type="button" data-action="play-track" data-track-id="${escapeHtml(track.id)}" data-scope="${escapeHtml(scope)}" ${playlistId ? `data-playlist-id="${escapeHtml(playlistId)}"` : ''} aria-label="Lire ${escapeHtml(title)}">
        <span class="artwork artwork-small" aria-hidden="true">${icon('music')}</span>
        <span class="track-copy"><strong class="track-title">${escapeHtml(title)}</strong><span class="track-subtitle">${escapeHtml(subtitle)}</span><span class="track-filename">${escapeHtml(track.fileName || '')}</span></span>
      </button>
      <span class="track-duration">${track.duration ? formatTime(track.duration) : '—:—'}</span>
      <button class="icon-button track-favorite${favClass}" type="button" data-action="toggle-favorite" data-track-id="${escapeHtml(track.id)}" aria-label="${isFavorite(track.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}" aria-pressed="${isFavorite(track.id)}" title="${isFavorite(track.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${icon('heart')}</button>
      <details class="track-menu">
        <summary class="icon-button" aria-label="Actions pour ${escapeHtml(title)}" title="Actions">${icon('more')}</summary>
        <div class="menu-panel" role="menu">
          <button type="button" role="menuitem" data-action="add-to-playlist" data-track-id="${escapeHtml(track.id)}">${icon('plusList')}Ajouter à une playlist</button>
          ${removeFromPlaylist}
          <button type="button" role="menuitem" class="is-danger" data-action="remove-track" data-track-id="${escapeHtml(track.id)}">${icon('trash')}Retirer de ma bibliothèque</button>
        </div>
      </details>
    </article>`;
  }

  function renderLibraryResults() {
    dom.librarySummary.textContent = `${state.tracks.length} ${state.tracks.length === 1 ? 'morceau conservé' : 'morceaux conservés'} sur cet appareil.`;
    dom.librarySort.value = state.preferences.librarySort;
    document.querySelectorAll('[data-action="set-filter"]').forEach((button) => {
      const active = button.dataset.filter === state.preferences.libraryFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const query = (dom.librarySearch.value || '').trim();
    dom.clearSearchButton.hidden = !query;
    const tracks = getSortedLibraryTracks();
    state.libraryVisibleTracks = tracks;
    dom.libraryResultsCount.textContent = tracks.length ? `${tracks.length} ${tracks.length === 1 ? 'morceau' : 'morceaux'}` : '';
    if (!tracks.length) {
      if (!state.tracks.length) {
        dom.libraryResults.innerHTML = `<div class="no-results"><p>Ta bibliothèque est encore vide.</p><p>Sélectionne des fichiers audio dans le stockage de ton téléphone pour les importer ici.</p><button class="button button-primary" type="button" data-action="import">Importer ma musique</button></div>`;
      } else {
        dom.libraryResults.innerHTML = `<div class="no-results">Aucun morceau ne correspond à cette recherche ou à ce filtre.</div>`;
      }
      return;
    }
    dom.libraryResults.innerHTML = tracks.map((track) => trackRowMarkup(track, 'library')).join('');
  }

  function getPlaylistTracks(playlist) {
    if (!playlist) return [];
    const byId = new Map(state.tracks.map((track) => [track.id, track]));
    return (playlist.trackIds || []).map((id) => byId.get(id)).filter(Boolean);
  }

  function renderPlaylists() {
    if (state.selectedPlaylistId && !getPlaylist(state.selectedPlaylistId)) state.selectedPlaylistId = null;
    if (!state.playlists.length) {
      dom.playlistList.innerHTML = `<div class="no-results"><p>Aucune playlist pour le moment.</p><p>Crée une sélection, puis ajoute-y les morceaux de ta bibliothèque.</p><button class="button button-primary" type="button" data-action="create-playlist">Créer ma première playlist</button></div>`;
    } else {
      const playlists = [...state.playlists].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      dom.playlistList.innerHTML = playlists.map((playlist) => {
        const count = (playlist.trackIds || []).length;
        return `<article class="playlist-card">
          <button class="playlist-card-open" type="button" data-action="select-playlist" data-playlist-id="${escapeHtml(playlist.id)}" aria-label="Afficher la playlist ${escapeHtml(playlist.name)}"><span class="playlist-cover" aria-hidden="true">${icon('list')}</span><span class="playlist-info"><h2>${escapeHtml(playlist.name)}</h2><p>${count} ${count === 1 ? 'morceau' : 'morceaux'}</p></span></button>
          <div class="playlist-card-actions">
            <button class="icon-button play-round" type="button" data-action="play-playlist" data-playlist-id="${escapeHtml(playlist.id)}" aria-label="Lire ${escapeHtml(playlist.name)}" title="Lire la playlist">${icon('play')}</button>
            <details class="track-menu"><summary class="icon-button" aria-label="Actions pour ${escapeHtml(playlist.name)}" title="Actions">${icon('more')}</summary><div class="menu-panel" role="menu"><button type="button" role="menuitem" data-action="rename-playlist" data-playlist-id="${escapeHtml(playlist.id)}">${icon('edit')}Renommer</button><button type="button" role="menuitem" class="is-danger" data-action="delete-playlist" data-playlist-id="${escapeHtml(playlist.id)}">${icon('trash')}Supprimer la playlist</button></div></details>
          </div>
        </article>`;
      }).join('');
    }
    renderPlaylistDetail();
  }

  function renderPlaylistDetail() {
    const playlist = getPlaylist(state.selectedPlaylistId);
    dom.playlistDetail.hidden = !playlist;
    if (!playlist) {
      dom.playlistDetail.innerHTML = '';
      return;
    }
    const tracks = getPlaylistTracks(playlist);
    const playlistCount = (playlist.trackIds || []).length;
    const unavailable = playlistCount - tracks.length;
    dom.playlistDetail.innerHTML = `<div class="playlist-detail-head"><div><p class="eyebrow">PLAYLIST</p><h2>${escapeHtml(playlist.name)}</h2><p>${tracks.length} ${tracks.length === 1 ? 'morceau disponible' : 'morceaux disponibles'}${unavailable > 0 ? ` · ${unavailable} fichier${unavailable > 1 ? 's' : ''} indisponible${unavailable > 1 ? 's' : ''}` : ''}</p></div><button class="icon-button" type="button" data-action="close-playlist-detail" aria-label="Fermer la playlist" title="Fermer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
      <div class="playlist-detail-actions"><button class="button button-primary" type="button" data-action="play-playlist" data-playlist-id="${escapeHtml(playlist.id)}" ${tracks.length ? '' : 'disabled'}>${icon('play')}Lire la playlist</button><button class="button button-outline" type="button" data-action="shuffle-playlist" data-playlist-id="${escapeHtml(playlist.id)}" ${tracks.length ? '' : 'disabled'}>Mélanger</button><button class="button button-outline" type="button" data-action="add-library-track">Ajouter des morceaux</button></div>
      <div class="track-list">${tracks.length ? tracks.map((track) => trackRowMarkup(track, 'playlist', playlist.id)).join('') : `<div class="no-results">Cette playlist ne contient pas encore de morceau. Ajoute des fichiers depuis ta bibliothèque.</div>`}</div>`;
  }

  function updatePlayerArtwork() {
    const track = state.currentTrack;
    if (state.currentArtworkUrl) {
      URL.revokeObjectURL(state.currentArtworkUrl);
      state.currentArtworkUrl = null;
    }
    if (track && track.artwork instanceof Blob) {
      try { state.currentArtworkUrl = URL.createObjectURL(track.artwork); } catch (error) { state.currentArtworkUrl = null; }
    }
    [dom.miniArtwork, dom.playerArtwork].forEach((element) => {
      if (!element) return;
      if (state.currentArtworkUrl) {
        element.innerHTML = `<img src="${state.currentArtworkUrl}" alt="">`;
      } else {
        element.innerHTML = icon('music');
      }
    });
  }

  function updateProgress() {
    const duration = Number.isFinite(dom.audio.duration) ? dom.audio.duration : (state.currentTrack && state.currentTrack.duration) || 0;
    const currentTime = Number.isFinite(dom.audio.currentTime) ? dom.audio.currentTime : 0;
    const shownTime = state.seeking && duration ? (Number(dom.seekRange.value) / Number(dom.seekRange.max)) * duration : currentTime;
    dom.seekRange.disabled = !state.currentTrack || !Number.isFinite(dom.audio.duration) || dom.audio.duration <= 0;
    dom.seekRange.value = duration ? String(Math.round((shownTime / duration) * Number(dom.seekRange.max))) : '0';
    const fill = duration ? Math.max(0, Math.min(100, (shownTime / duration) * 100)) : 0;
    dom.seekRange.style.setProperty('--range-fill', `${fill}%`);
    dom.elapsedTime.textContent = formatTime(shownTime);
    dom.totalTime.textContent = formatTime(duration);
    dom.miniProgress.style.setProperty('--progress', `${fill}%`);
  }

  function updatePlayerUI() {
    const track = state.currentTrack;
    dom.miniPlayer.hidden = !track;
    if (track) {
      const title = track.title || fileTitle(track.fileName);
      dom.miniTitle.textContent = title;
      dom.miniArtist.textContent = track.artist || track.fileName || 'Fichier audio local';
      dom.playerTitle.textContent = title;
      dom.playerArtist.textContent = track.artist || (track.album ? `Album · ${track.album}` : 'Fichier audio local');
      dom.playerFilename.textContent = track.fileName || '';
      dom.playerFilename.hidden = !track.fileName;
      const playing = !dom.audio.paused && !dom.audio.ended;
      dom.miniPlayButton.innerHTML = icon(playing ? 'pause' : 'play');
      dom.mainPlayButton.innerHTML = icon(playing ? 'pause' : 'play');
      dom.miniPlayButton.setAttribute('aria-label', playing ? 'Mettre en pause' : 'Lire');
      dom.mainPlayButton.setAttribute('aria-label', playing ? 'Mettre en pause' : 'Lire');
      const favorite = isFavorite(track.id);
      dom.playerFavoriteButton.innerHTML = icon('heart');
      dom.playerFavoriteButton.classList.toggle('is-favorite', favorite);
      dom.playerFavoriteButton.setAttribute('aria-label', favorite ? 'Retirer des favoris' : 'Ajouter aux favoris');
      dom.playerFavoriteButton.setAttribute('aria-pressed', String(favorite));
    } else {
      dom.miniTitle.textContent = '—';
      dom.miniArtist.textContent = 'Aucun morceau';
      dom.playerTitle.textContent = 'Choisis un morceau';
      dom.playerArtist.textContent = 'Ta musique. Ton espace. Ton contrôle.';
      dom.playerFilename.textContent = '';
      dom.miniPlayButton.innerHTML = icon('play');
      dom.mainPlayButton.innerHTML = icon('play');
      dom.playerFavoriteButton.innerHTML = icon('heart');
    }
    dom.shuffleButton.setAttribute('aria-pressed', String(state.preferences.shuffle));
    dom.shuffleButton.setAttribute('aria-label', state.preferences.shuffle ? 'Désactiver le mode aléatoire' : 'Activer le mode aléatoire');
    dom.repeatButton.setAttribute('aria-pressed', String(state.preferences.repeat !== 'off'));
    const repeatLabel = state.preferences.repeat === 'one' ? 'Répéter le morceau' : state.preferences.repeat === 'all' ? 'Répéter la file d’attente' : 'Répétition désactivée';
    dom.repeatButton.setAttribute('aria-label', repeatLabel);
    dom.repeatOneMark.hidden = state.preferences.repeat !== 'one';
    if (dom.audio.error) dom.playbackState.textContent = 'Erreur de lecture';
    else if (!track) dom.playbackState.textContent = 'En attente';
    else if (dom.audio.ended) dom.playbackState.textContent = 'Lecture terminée';
    else if (dom.audio.paused) dom.playbackState.textContent = dom.audio.currentTime > 0 ? 'En pause' : 'Prêt à lire';
    else dom.playbackState.textContent = 'En lecture';
    updateProgress();
  }

  function renderAll() {
    renderHome();
    renderLibraryResults();
    renderPlaylists();
    updatePlayerUI();
  }

  function getQueueForButton(button, trackId) {
    const scope = button.dataset.scope || 'library';
    let ids;
    if (scope === 'playlist') {
      const playlist = getPlaylist(button.dataset.playlistId);
      ids = playlist ? (playlist.trackIds || []).filter((id) => getTrack(id)) : [];
    } else if (scope === 'favorites') {
      ids = favoriteIds();
    } else if (scope === 'recent') {
      ids = historyTracks().map((track) => track.id);
    } else if (scope === 'added') {
      ids = recentAddedTracks(1000).map((track) => track.id);
    } else {
      ids = state.libraryVisibleTracks.length ? state.libraryVisibleTracks.map((track) => track.id) : state.tracks.map((track) => track.id);
    }
    if (!ids.includes(trackId)) ids.unshift(trackId);
    return [...new Set(ids)];
  }

  async function activateTrack(trackId, queueIds = [], options = {}) {
    const trackFromState = getTrack(trackId);
    let track = trackFromState;
    if (!track) {
      showToast('Ce morceau n’est plus présent dans la bibliothèque.', true);
      return false;
    }
    if (state.currentTrack && state.currentTrack.id === trackId && dom.audio.src) {
      const proposed = queueIds.filter((id) => getTrack(id));
      state.currentQueue = [...new Set(proposed.length ? proposed : [trackId])];
      if (!state.currentQueue.includes(trackId)) state.currentQueue.unshift(trackId);
      if (options.autoplay) await playAudio();
      updatePlayerUI();
      return true;
    }

    // Les blobs déjà chargés depuis IndexedDB sont réutilisés : cela évite un aller-retour asynchrone
    // avant play(), important pour conserver le geste utilisateur exigé par certains navigateurs mobiles.
    let stored = trackFromState;
    if (!stored || !(stored.blob instanceof Blob)) {
      try { stored = await getRecord('tracks', trackId); }
      catch (error) {
        showToast('Impossible d’ouvrir ce fichier dans le stockage local.', true);
        return false;
      }
    }
    if (!stored || !(stored.blob instanceof Blob)) {
      showToast('Le fichier importé n’est plus accessible. Retire-le puis importe-le à nouveau.', true);
      return false;
    }
    track = stored;

    dom.audio.pause();
    dom.audio.removeAttribute('src');
    try { dom.audio.load(); } catch (error) { /* navigateur */ }
    if (state.currentObjectUrl) URL.revokeObjectURL(state.currentObjectUrl);
    state.currentObjectUrl = null;

    state.currentTrack = track;
    const safeQueue = [...new Set(queueIds.filter((id) => getTrack(id)))];
    state.currentQueue = safeQueue.length ? safeQueue : [trackId];
    if (!state.currentQueue.includes(trackId)) state.currentQueue.unshift(trackId);
    state.preferences.lastTrackId = trackId;
    state.preferences.lastPosition = Math.max(0, Number(options.position) || 0);
    state.pendingSeek = state.preferences.lastPosition;
    savePreferences();
    updatePlayerArtwork();
    try {
      state.currentObjectUrl = URL.createObjectURL(stored.blob);
      dom.audio.volume = state.preferences.volume;
      dom.audio.src = state.currentObjectUrl;
      dom.audio.load();
    } catch (error) {
      showToast('Le navigateur n’a pas pu ouvrir ce fichier audio.', true);
      updatePlayerUI();
      return false;
    }
    renderAll();
    if (options.autoplay) await playAudio();
    return true;
  }

  async function playAudio() {
    if (!state.currentTrack) {
      const firstTrack = state.tracks[0];
      if (!firstTrack) {
        showToast('Importe d’abord un morceau pour commencer l’écoute.');
        return;
      }
      const started = await activateTrack(firstTrack.id, state.tracks.map((track) => track.id), { autoplay: false });
      if (!started) return;
    }
    try {
      await dom.audio.play();
      updatePlayerUI();
    } catch (error) {
      updatePlayerUI();
      showToast('La lecture n’a pas démarré. Vérifie le format du fichier et réessaie.', true);
    }
  }

  async function togglePlayback() {
    if (!state.currentTrack && !state.tracks.length) {
      showToast('Importe d’abord un morceau pour commencer l’écoute.');
      return;
    }
    if (dom.audio.paused) await playAudio();
    else dom.audio.pause();
    updatePlayerUI();
  }

  function sanitizeQueue() {
    const valid = state.currentQueue.filter((id) => getTrack(id));
    if (state.currentTrack && !valid.includes(state.currentTrack.id)) valid.unshift(state.currentTrack.id);
    state.currentQueue = [...new Set(valid)];
    return state.currentQueue;
  }

  function pickShuffleNext(ids, currentId) {
    const candidates = ids.filter((id) => id !== currentId);
    if (!candidates.length) return currentId;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  async function goNext(ended = false) {
    if (!state.currentTrack) return;
    const queue = sanitizeQueue();
    if (ended && state.preferences.repeat === 'one') {
      try { dom.audio.currentTime = 0; await dom.audio.play(); } catch (error) { updatePlayerUI(); }
      return;
    }
    if (!queue.length) return;
    let nextId = null;
    if (state.preferences.shuffle && queue.length > 1) {
      nextId = pickShuffleNext(queue, state.currentTrack.id);
    } else {
      const index = queue.indexOf(state.currentTrack.id);
      if (index >= 0 && index < queue.length - 1) nextId = queue[index + 1];
      else if (state.preferences.repeat === 'all' && queue.length) nextId = queue[0];
    }
    if (!nextId) {
      if (ended) {
        try { dom.audio.currentTime = 0; } catch (error) { /* durée inconnue */ }
        dom.audio.pause();
        updatePlayerUI();
      } else {
        showToast('Fin de la file d’attente. Active la répétition pour repartir du début.');
      }
      return;
    }
    await activateTrack(nextId, queue, { autoplay: true });
  }

  async function goPrevious() {
    if (!state.currentTrack) return;
    if (Number.isFinite(dom.audio.currentTime) && dom.audio.currentTime > 3) {
      dom.audio.currentTime = 0;
      updatePlayerUI();
      return;
    }
    const queue = sanitizeQueue();
    if (!queue.length) return;
    let previousId = null;
    if (state.preferences.shuffle && queue.length > 1) {
      previousId = pickShuffleNext(queue, state.currentTrack.id);
    } else {
      const index = queue.indexOf(state.currentTrack.id);
      if (index > 0) previousId = queue[index - 1];
      else if (state.preferences.repeat === 'all' && queue.length) previousId = queue[queue.length - 1];
    }
    if (previousId) await activateTrack(previousId, queue, { autoplay: true });
    else {
      try { dom.audio.currentTime = 0; } catch (error) { /* durée inconnue */ }
      updatePlayerUI();
    }
  }

  function recordHistory(trackId) {
    if (!trackId) return;
    state.preferences.history = [trackId, ...state.preferences.history.filter((id) => id !== trackId)].slice(0, MAX_HISTORY);
    state.preferences.lastTrackId = trackId;
    savePreferences();
    renderHome();
  }

  function saveCurrentPosition(force = false) {
    if (!state.currentTrack) return;
    const now = Date.now();
    if (!force && now - state.lastPositionWrite < 4500) return;
    state.lastPositionWrite = now;
    state.preferences.lastTrackId = state.currentTrack.id;
    state.preferences.lastPosition = Number.isFinite(dom.audio.currentTime) ? dom.audio.currentTime : 0;
    savePreferences();
  }

  function openPlayer() {
    if (!state.currentTrack) {
      showToast('Choisis un morceau dans ta bibliothèque pour ouvrir le lecteur.');
      return;
    }
    if (!dom.playerDialog.open) dom.playerDialog.showModal();
    updatePlayerUI();
  }

  function closePlayer() {
    if (dom.playerDialog.open) dom.playerDialog.close();
  }

  function navigate(view) {
    if (!['home', 'library', 'playlists', 'settings'].includes(view)) return;
    if (dom.playerDialog.open) closePlayer();
    state.currentView = view;
    document.querySelectorAll('[data-view-panel]').forEach((panel) => { panel.hidden = panel.dataset.viewPanel !== view; });
    document.querySelectorAll('.nav-item').forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (view === 'home') renderHome();
    if (view === 'library') renderLibraryResults();
    if (view === 'playlists') renderPlaylists();
    if (view === 'settings') refreshStorageInfo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleFavorite(trackId) {
    if (!getTrack(trackId)) return;
    if (isFavorite(trackId)) state.preferences.favorites = state.preferences.favorites.filter((id) => id !== trackId);
    else state.preferences.favorites = [trackId, ...state.preferences.favorites];
    savePreferences();
    renderAll();
  }

  function openPlaylistDialog(mode = 'create', playlistId = '') {
    state.editingPlaylistId = mode === 'rename' ? playlistId : null;
    const playlist = state.editingPlaylistId ? getPlaylist(state.editingPlaylistId) : null;
    dom.playlistDialogHeading.textContent = playlist ? 'Renommer la playlist' : 'Créer une playlist';
    dom.playlistName.value = playlist ? playlist.name : '';
    dom.playlistFormError.textContent = '';
    if (!dom.playlistDialog.open) dom.playlistDialog.showModal();
    window.setTimeout(() => dom.playlistName.focus(), 40);
  }

  function closePlaylistDialog() {
    if (dom.playlistDialog.open) dom.playlistDialog.close();
    state.pendingPlaylistTrackId = null;
  }

  async function savePlaylistForm(event) {
    event.preventDefault();
    const name = dom.playlistName.value.trim();
    if (!name) {
      dom.playlistFormError.textContent = 'Saisis un nom pour continuer.';
      dom.playlistName.focus();
      return;
    }
    try {
      if (state.editingPlaylistId) {
        const existing = getPlaylist(state.editingPlaylistId);
        if (!existing) throw new Error('Cette playlist n’existe plus.');
        const updated = { ...existing, name, updatedAt: Date.now() };
        await putRecord('playlists', updated);
        state.playlists = state.playlists.map((item) => item.id === updated.id ? updated : item);
        showToast('Playlist renommée.');
      } else {
        const pendingTrackId = state.pendingPlaylistTrackId;
        const playlist = { id: makeId(), name, trackIds: pendingTrackId && getTrack(pendingTrackId) ? [pendingTrackId] : [], createdAt: Date.now(), updatedAt: Date.now() };
        await putRecord('playlists', playlist);
        state.playlists = [playlist, ...state.playlists];
        state.selectedPlaylistId = playlist.id;
        showToast(pendingTrackId ? 'Playlist créée et morceau ajouté.' : 'Playlist créée.');
        state.pendingPlaylistTrackId = null;
      }
      closePlaylistDialog();
      renderAll();
    } catch (error) {
      dom.playlistFormError.textContent = error.message || 'Impossible d’enregistrer la playlist.';
    }
  }

  function openAddToPlaylist(trackId) {
    const track = getTrack(trackId);
    if (!track) return;
    state.addingTrackId = trackId;
    dom.addTrackName.textContent = track.title || fileTitle(track.fileName);
    renderPlaylistChoices();
    if (!dom.addToPlaylistDialog.open) dom.addToPlaylistDialog.showModal();
  }

  function renderPlaylistChoices() {
    const trackId = state.addingTrackId;
    if (!state.playlists.length) {
      dom.playlistChoiceList.innerHTML = '<div class="no-results">Aucune playlist. Crée-en une pour y ajouter ce morceau.</div>';
      return;
    }
    dom.playlistChoiceList.innerHTML = state.playlists.map((playlist) => {
      const alreadyAdded = (playlist.trackIds || []).includes(trackId);
      return `<button class="playlist-choice" type="button" data-action="choose-playlist" data-playlist-id="${escapeHtml(playlist.id)}" ${alreadyAdded ? 'disabled' : ''}><span>${escapeHtml(playlist.name)}</span><span>${alreadyAdded ? 'Déjà ajouté' : `${(playlist.trackIds || []).length} morceau${(playlist.trackIds || []).length === 1 ? '' : 'x'}`}</span></button>`;
    }).join('');
  }

  async function addTrackToPlaylist(playlistId, trackId) {
    const playlist = getPlaylist(playlistId);
    if (!playlist || !getTrack(trackId)) return;
    if ((playlist.trackIds || []).includes(trackId)) {
      showToast('Ce morceau est déjà dans cette playlist.');
      return;
    }
    const updated = { ...playlist, trackIds: [...(playlist.trackIds || []), trackId], updatedAt: Date.now() };
    await putRecord('playlists', updated);
    state.playlists = state.playlists.map((item) => item.id === playlistId ? updated : item);
    if (dom.addToPlaylistDialog.open) dom.addToPlaylistDialog.close();
    renderAll();
    showToast('Morceau ajouté à la playlist.');
  }

  async function removeTrackFromPlaylist(playlistId, trackId) {
    const playlist = getPlaylist(playlistId);
    if (!playlist) return;
    const updated = { ...playlist, trackIds: (playlist.trackIds || []).filter((id) => id !== trackId), updatedAt: Date.now() };
    await putRecord('playlists', updated);
    state.playlists = state.playlists.map((item) => item.id === playlistId ? updated : item);
    renderPlaylists();
    showToast('Morceau retiré de la playlist.');
  }

  async function deletePlaylist(playlistId) {
    const playlist = getPlaylist(playlistId);
    if (!playlist) return;
    const okay = window.confirm(`Supprimer la playlist « ${playlist.name} » ? Les fichiers audio resteront dans ta bibliothèque.`);
    if (!okay) return;
    await deleteRecord('playlists', playlistId);
    state.playlists = state.playlists.filter((item) => item.id !== playlistId);
    if (state.selectedPlaylistId === playlistId) state.selectedPlaylistId = null;
    renderAll();
    showToast('Playlist supprimée. Les morceaux sont conservés.');
  }

  async function playPlaylist(playlistId, shuffle = false) {
    const playlist = getPlaylist(playlistId);
    const tracks = getPlaylistTracks(playlist);
    if (!tracks.length) {
      showToast('Cette playlist ne contient aucun morceau disponible.');
      return;
    }
    let queue = tracks.map((track) => track.id);
    if (shuffle) {
      state.preferences.shuffle = true;
      queue = queue.sort(() => Math.random() - 0.5);
      savePreferences();
    }
    await activateTrack(queue[0], queue, { autoplay: true });
  }

  async function removeTrack(trackId) {
    const track = getTrack(trackId);
    if (!track) return;
    const okay = window.confirm(`Retirer « ${track.title || fileTitle(track.fileName)} » de Tchatz Music ? La copie locale sera supprimée. Le fichier d’origine sur le téléphone ne sera pas modifié.`);
    if (!okay) return;
    try {
      if (state.currentTrack && state.currentTrack.id === trackId) clearCurrentTrack();
      await deleteRecord('tracks', trackId);
      state.tracks = state.tracks.filter((item) => item.id !== trackId);
      for (const playlist of [...state.playlists]) {
        if ((playlist.trackIds || []).includes(trackId)) {
          const updated = { ...playlist, trackIds: playlist.trackIds.filter((id) => id !== trackId), updatedAt: Date.now() };
          await putRecord('playlists', updated);
          state.playlists = state.playlists.map((item) => item.id === updated.id ? updated : item);
        }
      }
      state.preferences.favorites = state.preferences.favorites.filter((id) => id !== trackId);
      state.preferences.history = state.preferences.history.filter((id) => id !== trackId);
      if (state.preferences.lastTrackId === trackId) {
        state.preferences.lastTrackId = null;
        state.preferences.lastPosition = 0;
      }
      state.currentQueue = state.currentQueue.filter((id) => id !== trackId);
      savePreferences();
      renderAll();
      showToast('Morceau retiré de la bibliothèque.');
    } catch (error) {
      showToast('Impossible de retirer ce morceau du stockage local.', true);
    }
  }

  function clearCurrentTrack() {
    dom.audio.pause();
    dom.audio.removeAttribute('src');
    try { dom.audio.load(); } catch (error) { /* navigateur */ }
    if (state.currentObjectUrl) URL.revokeObjectURL(state.currentObjectUrl);
    if (state.currentArtworkUrl) URL.revokeObjectURL(state.currentArtworkUrl);
    state.currentObjectUrl = null;
    state.currentArtworkUrl = null;
    state.currentTrack = null;
    state.currentQueue = [];
    state.pendingSeek = null;
    state.preferences.lastTrackId = null;
    state.preferences.lastPosition = 0;
    updatePlayerArtwork();
    updatePlayerUI();
  }

  async function importFiles(files) {
    const selected = Array.from(files || []);
    if (!selected.length || state.importBusy) return;
    state.importBusy = true;
    const report = { added: 0, skipped: 0, failed: 0, issues: [] };
    const existingFingerprints = new Set(state.tracks.map((track) => track.fingerprint || `${String(track.fileName || '').trim().toLocaleLowerCase('fr')}|${Number(track.size) || 0}|${Number(track.lastModified) || 0}`));
    let availableBytes = null;
    try {
      if (navigator.storage && typeof navigator.storage.estimate === 'function') {
        const estimate = await navigator.storage.estimate();
        if (Number.isFinite(estimate.quota) && Number.isFinite(estimate.usage)) availableBytes = Math.max(0, estimate.quota - estimate.usage);
      }
    } catch (error) { /* l'estimation est facultative */ }

    dom.importStatus.textContent = `Préparation de ${selected.length} ${selected.length === 1 ? 'fichier' : 'fichiers'}…`;
    dom.importProgress.value = 0;
    dom.importCounts.textContent = `0 sur ${selected.length}`;
    dom.importIssues.innerHTML = '';
    dom.importCloseButton.disabled = true;
    if (!dom.importDialog.open) dom.importDialog.showModal();

    const addIssue = (name, reason) => {
      if (report.issues.length < MAX_IMPORT_ISSUES) report.issues.push(`${name}: ${reason}`);
      else report.moreIssues = (report.moreIssues || 0) + 1;
      const visible = report.issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join('');
      const more = report.moreIssues ? `<li>Et ${report.moreIssues} autre${report.moreIssues > 1 ? 's' : ''} problème${report.moreIssues > 1 ? 's' : ''}.</li>` : '';
      dom.importIssues.innerHTML = visible + more;
    };

    try {
      await openDatabase();
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        const position = index + 1;
        dom.importStatus.textContent = `Vérification de ${file.name || 'fichier audio'}…`;
        dom.importCounts.textContent = `${index} sur ${selected.length}`;
        dom.importProgress.value = Math.round((index / selected.length) * 100);
        await new Promise((resolve) => window.requestAnimationFrame(resolve));

        const extension = getExtension(file.name);
        const format = FORMATS[extension];
        if (!file.size) {
          report.failed += 1;
          addIssue(file.name || 'Fichier', 'fichier vide ou illisible.');
          continue;
        }
        if (!format) {
          report.failed += 1;
          addIssue(file.name || 'Fichier', 'format non pris en charge. Formats acceptés : MP3, WAV, OGG, M4A et AAC.');
          continue;
        }
        if (!isFormatPlayable(format)) {
          report.failed += 1;
          addIssue(file.name, 'ce navigateur ne déclare pas la prise en charge de ce format audio.');
          continue;
        }
        const fingerprint = getFingerprint(file);
        if (existingFingerprints.has(fingerprint)) {
          report.skipped += 1;
          addIssue(file.name, 'déjà présent dans la bibliothèque ; doublon ignoré.');
          continue;
        }
        if (availableBytes !== null && file.size > availableBytes) {
          report.failed += 1;
          addIssue(file.name, `espace local estimé insuffisant (${formatBytes(availableBytes)} disponible).`);
          continue;
        }

        try {
          dom.importStatus.textContent = `Lecture des informations : ${file.name}`;
          const tags = await readId3Metadata(file, extension);
          // Blob.slice conserve les octets sans recopier le fichier, tout en normalisant son type MIME.
          const playableBlob = file.slice(0, file.size, format.mime);
          const duration = await readDuration(playableBlob);
          const record = {
            id: makeId(),
            fileName: file.name,
            title: tags.title || fileTitle(file.name),
            artist: tags.artist || '',
            album: tags.album || '',
            artwork: tags.artwork || null,
            mimeType: format.mime,
            extension,
            size: file.size,
            lastModified: file.lastModified || 0,
            fingerprint,
            duration,
            addedAt: Date.now(),
            blob: playableBlob
          };
          await putRecord('tracks', record);
          state.tracks.push(record);
          existingFingerprints.add(fingerprint);
          report.added += 1;
          if (availableBytes !== null) availableBytes = Math.max(0, availableBytes - file.size);
        } catch (error) {
          report.failed += 1;
          const reason = error && (error.name === 'QuotaExceededError' || /quota|space/i.test(error.message || ''))
            ? 'espace de stockage local insuffisant. Libère de la place puis réessaie.'
            : 'impossible de conserver ce fichier dans le stockage local.';
          addIssue(file.name, reason);
        }
        dom.importCounts.textContent = `${position} sur ${selected.length}`;
        dom.importProgress.value = Math.round((position / selected.length) * 100);
      }
    } catch (error) {
      report.failed += selected.length - report.added - report.skipped;
      addIssue('Stockage local', error.message || 'IndexedDB est inaccessible.');
    } finally {
      state.importBusy = false;
      state.tracks.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      renderAll();
      dom.importProgress.value = 100;
      dom.importCounts.textContent = `${selected.length} sur ${selected.length}`;
      dom.importStatus.textContent = `${report.added} ajouté${report.added > 1 ? 's' : ''} · ${report.skipped} doublon${report.skipped > 1 ? 's' : ''} ignoré${report.skipped > 1 ? 's' : ''} · ${report.failed} échec${report.failed > 1 ? 's' : ''}`;
      dom.importCloseButton.disabled = false;
      if (report.added) showToast(`${report.added} ${report.added === 1 ? 'morceau importé' : 'morceaux importés'} dans ta bibliothèque.`);
      else if (!report.failed && report.skipped) showToast('Aucun nouveau morceau : les fichiers sélectionnés étaient déjà présents.');
      else if (report.failed) showToast('Aucun fichier n’a pu être importé. Consulte le détail.', true);
    }
  }

  async function refreshStorageInfo() {
    dom.storageUsage.textContent = 'Calcul en cours…';
    dom.storageQuota.textContent = '';
    dom.storageMeterFill.style.width = '0%';
    if (!navigator.storage || typeof navigator.storage.estimate !== 'function') {
      dom.storageUsage.textContent = 'Estimation non disponible';
      dom.storageQuota.textContent = 'Le navigateur ne fournit pas ces informations.';
      return;
    }
    try {
      const estimate = await navigator.storage.estimate();
      if (!Number.isFinite(estimate.usage) || !Number.isFinite(estimate.quota)) throw new Error('estimate unavailable');
      const percent = estimate.quota > 0 ? Math.min(100, (estimate.usage / estimate.quota) * 100) : 0;
      dom.storageMeterFill.style.width = `${percent.toFixed(1)}%`;
      dom.storageUsage.textContent = `${formatBytes(estimate.usage)} utilisés`;
      dom.storageQuota.textContent = `sur ${formatBytes(estimate.quota)} estimés`;
      dom.storageNote.textContent = 'Estimation de tout le stockage de cette origine (pas uniquement la musique). La capacité réelle dépend du navigateur et de l’espace libre sur le téléphone.';
    } catch (error) {
      dom.storageUsage.textContent = 'Estimation non disponible';
      dom.storageQuota.textContent = 'Consulte les réglages de stockage du navigateur.';
    }
  }

  async function requestPersistentStorage() {
    if (!navigator.storage || typeof navigator.storage.persist !== 'function') {
      dom.persistStatus.textContent = 'Cette version du navigateur ne permet pas de demander un stockage persistant.';
      return;
    }
    try {
      const already = typeof navigator.storage.persisted === 'function' ? await navigator.storage.persisted() : false;
      if (already) {
        dom.persistStatus.textContent = 'Le navigateur marque déjà ce stockage comme persistant.';
        return;
      }
      const granted = await navigator.storage.persist();
      dom.persistStatus.textContent = granted
        ? 'Le navigateur a accordé le stockage persistant. Garde malgré tout une copie de tes fichiers originaux.'
        : 'Le navigateur n’a pas accordé le stockage persistant. Il peut évincer des données locales en cas de manque d’espace.';
    } catch (error) {
      dom.persistStatus.textContent = 'La demande de stockage persistant n’a pas abouti dans ce navigateur.';
    }
  }

  async function resetPreferences() {
    const okay = window.confirm('Réinitialiser les favoris, l’historique, le volume, le mode de lecture et les préférences de la bibliothèque ? Les morceaux et les playlists seront conservés.');
    if (!okay) return;
    state.preferences = defaultPreferences();
    savePreferences();
    dom.audio.volume = state.preferences.volume;
    dom.volumeRange.value = String(state.preferences.volume);
    renderAll();
    showToast('Préférences réinitialisées. Les morceaux et playlists sont conservés.');
  }

  async function clearAllData() {
    const okay = window.confirm('Effacer définitivement tous les fichiers importés, playlists, favoris et préférences de Tchatz Music sur cet appareil ? Les fichiers originaux du téléphone ne seront pas supprimés.');
    if (!okay) return;
    try {
      clearCurrentTrack();
      await clearLocalStores();
      localStorage.removeItem(PREFS_KEY);
      state.preferences = defaultPreferences();
      state.tracks = [];
      state.playlists = [];
      state.libraryVisibleTracks = [];
      state.selectedPlaylistId = null;
      state.currentQueue = [];
      dom.volumeRange.value = String(state.preferences.volume);
      if (dom.playerDialog.open) dom.playerDialog.close();
      renderAll();
      await refreshStorageInfo();
      showToast('Toutes les données locales de Tchatz Music ont été effacées.');
    } catch (error) {
      showToast('Impossible d’effacer toutes les données locales. Ferme les autres onglets de l’application puis réessaie.', true);
    }
  }

  function updateConnectionBadge() {
    const offline = navigator.onLine === false;
    dom.connectionBadge.classList.toggle('is-offline', offline);
    dom.connectionLabel.textContent = offline ? 'Hors ligne' : 'Bibliothèque locale';
  }

  function updateInstallButtons() {
    const installed = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    const available = Boolean(state.deferredInstallPrompt) && !installed;
    dom.installTopButton.hidden = !available;
    dom.installSettingsButton.hidden = !available;
    if (installed) dom.installHelp.textContent = 'Tchatz Music est lancé en mode application sur cet appareil.';
    else if (available) dom.installHelp.textContent = 'Ton navigateur peut installer Tchatz Music maintenant.';
  }

  async function installApp() {
    if (!state.deferredInstallPrompt) {
      showToast('Dans Chrome Android, ouvre le menu puis choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ».');
      return;
    }
    try {
      state.deferredInstallPrompt.prompt();
      const result = await state.deferredInstallPrompt.userChoice;
      state.deferredInstallPrompt = null;
      updateInstallButtons();
      if (result && result.outcome === 'accepted') showToast('Tchatz Music a été ajouté à l’écran d’accueil.');
      else showToast('Installation non confirmée. Tu peux la relancer depuis le menu du navigateur.');
    } catch (error) {
      showToast('Le navigateur n’a pas pu démarrer l’installation. Utilise son menu Ajouter à l’écran d’accueil.', true);
    }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(() => {
      // L'aperçu intégré peut restreindre les Service Workers ; l'écoute locale reste disponible.
    });
  }

  function handleAction(button) {
    const action = button.dataset.action;
    const trackId = button.dataset.trackId;
    const playlistId = button.dataset.playlistId;
    if (button.closest('details')) button.closest('details').removeAttribute('open');
    switch (action) {
      case 'navigate': navigate(button.dataset.view); break;
      case 'import': dom.filePicker.click(); break;
      case 'open-player': openPlayer(); break;
      case 'close-player': closePlayer(); break;
      case 'toggle-play': return togglePlayback();
      case 'next': return goNext(false);
      case 'previous': return goPrevious();
      case 'toggle-shuffle':
        state.preferences.shuffle = !state.preferences.shuffle;
        savePreferences(); updatePlayerUI(); showToast(state.preferences.shuffle ? 'Mode aléatoire activé.' : 'Mode aléatoire désactivé.');
        break;
      case 'toggle-repeat':
        state.preferences.repeat = state.preferences.repeat === 'off' ? 'all' : state.preferences.repeat === 'all' ? 'one' : 'off';
        savePreferences(); updatePlayerUI();
        showToast(state.preferences.repeat === 'one' ? 'Répétition du morceau activée.' : state.preferences.repeat === 'all' ? 'Répétition de la file activée.' : 'Répétition désactivée.');
        break;
      case 'play-track': {
        const queue = getQueueForButton(button, trackId);
        return activateTrack(trackId, queue, { autoplay: true });
      }
      case 'toggle-favorite': toggleFavorite(trackId); break;
      case 'toggle-current-favorite': if (state.currentTrack) toggleFavorite(state.currentTrack.id); break;
      case 'set-filter':
        state.preferences.libraryFilter = button.dataset.filter === 'favorites' ? 'favorites' : 'all';
        savePreferences(); renderLibraryResults(); break;
      case 'create-playlist': openPlaylistDialog('create'); break;
      case 'rename-playlist': openPlaylistDialog('rename', playlistId); break;
      case 'delete-playlist': return deletePlaylist(playlistId);
      case 'select-playlist':
        state.selectedPlaylistId = state.selectedPlaylistId === playlistId ? null : playlistId;
        renderPlaylistDetail();
        break;
      case 'close-playlist-detail': state.selectedPlaylistId = null; renderPlaylistDetail(); break;
      case 'play-playlist': return playPlaylist(playlistId, false);
      case 'shuffle-playlist': return playPlaylist(playlistId, true);
      case 'add-to-playlist': openAddToPlaylist(trackId); break;
      case 'choose-playlist': return addTrackToPlaylist(playlistId, state.addingTrackId);
      case 'remove-from-playlist': return removeTrackFromPlaylist(playlistId, trackId);
      case 'remove-track': return removeTrack(trackId);
      case 'add-library-track': navigate('library'); showToast('Choisis un morceau puis ouvre son menu pour l’ajouter à cette playlist.'); break;
      case 'close-playlist-dialog': closePlaylistDialog(); break;
      case 'close-add-dialog': if (dom.addToPlaylistDialog.open) dom.addToPlaylistDialog.close(); break;
      case 'create-playlist-from-add':
        state.pendingPlaylistTrackId = state.addingTrackId;
        if (dom.addToPlaylistDialog.open) dom.addToPlaylistDialog.close();
        openPlaylistDialog('create');
        break;
      case 'close-import': if (!state.importBusy && dom.importDialog.open) dom.importDialog.close(); break;
      case 'refresh-storage': return refreshStorageInfo();
      case 'persist-storage': return requestPersistentStorage();
      case 'reset-preferences': return resetPreferences();
      case 'clear-data': return clearAllData();
      case 'install': return installApp();
      default: break;
    }
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || button.disabled) return;
      try {
        const result = handleAction(button);
        if (result && typeof result.catch === 'function') result.catch((error) => showToast(error.message || 'Une erreur est survenue.', true));
      } catch (error) {
        showToast(error.message || 'Une erreur est survenue.', true);
      }
    });

    dom.filePicker.addEventListener('change', () => {
      const files = Array.from(dom.filePicker.files || []);
      dom.filePicker.value = '';
      if (files.length) importFiles(files);
    });
    dom.librarySearch.addEventListener('input', () => renderLibraryResults());
    dom.librarySort.addEventListener('change', () => {
      state.preferences.librarySort = dom.librarySort.value === 'title' ? 'title' : 'recent';
      savePreferences(); renderLibraryResults();
    });
    document.getElementById('clearSearchButton').addEventListener('click', () => {
      dom.librarySearch.value = '';
      renderLibraryResults();
      dom.librarySearch.focus();
    });
    dom.playlistForm.addEventListener('submit', savePlaylistForm);
    dom.seekRange.addEventListener('input', () => {
      state.seeking = true;
      updateProgress();
    });
    dom.seekRange.addEventListener('change', () => {
      const duration = Number.isFinite(dom.audio.duration) ? dom.audio.duration : 0;
      if (duration > 0) dom.audio.currentTime = (Number(dom.seekRange.value) / Number(dom.seekRange.max)) * duration;
      state.seeking = false;
      updateProgress();
      saveCurrentPosition(true);
    });
    dom.volumeRange.addEventListener('input', () => {
      const volume = Math.max(0, Math.min(1, Number(dom.volumeRange.value)));
      state.preferences.volume = volume;
      dom.audio.volume = volume;
      savePreferences();
    });
    dom.audio.addEventListener('loadedmetadata', async () => {
      const duration = Number.isFinite(dom.audio.duration) ? dom.audio.duration : null;
      if (state.currentTrack && duration && duration > 0) {
        state.currentTrack.duration = duration;
        try { await putRecord('tracks', state.currentTrack); } catch (error) { /* durée en mémoire uniquement */ }
      }
      if (state.pendingSeek !== null && Number.isFinite(dom.audio.duration) && dom.audio.duration > 0) {
        const position = Math.min(state.pendingSeek, Math.max(0, dom.audio.duration - 0.25));
        try { dom.audio.currentTime = position; } catch (error) { /* navigateur */ }
        state.pendingSeek = null;
      }
      updatePlayerUI();
    });
    dom.audio.addEventListener('durationchange', updatePlayerUI);
    dom.audio.addEventListener('timeupdate', () => {
      updateProgress();
      saveCurrentPosition(false);
    });
    dom.audio.addEventListener('play', () => updatePlayerUI());
    dom.audio.addEventListener('playing', () => {
      if (state.currentTrack) recordHistory(state.currentTrack.id);
      updatePlayerUI();
    });
    dom.audio.addEventListener('pause', () => {
      saveCurrentPosition(true);
      updatePlayerUI();
    });
    dom.audio.addEventListener('ended', () => goNext(true));
    dom.audio.addEventListener('error', () => {
      if (state.currentTrack) showToast('Ce fichier ne peut pas être lu dans ce navigateur. Essaie un autre format audio pris en charge.', true);
      updatePlayerUI();
    });
    dom.audio.addEventListener('waiting', () => { if (state.currentTrack) dom.playbackState.textContent = 'Chargement…'; });
    window.addEventListener('beforeunload', () => saveCurrentPosition(true));
    window.addEventListener('pagehide', () => saveCurrentPosition(true));
    window.addEventListener('online', updateConnectionBadge);
    window.addEventListener('offline', updateConnectionBadge);
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      state.deferredInstallPrompt = event;
      updateInstallButtons();
    });
    window.addEventListener('appinstalled', () => {
      state.deferredInstallPrompt = null;
      updateInstallButtons();
      showToast('Tchatz Music est installé.');
    });
  }

  async function loadApp() {
    dom.volumeRange.value = String(state.preferences.volume);
    dom.audio.volume = state.preferences.volume;
    dom.librarySort.value = state.preferences.librarySort;
    try {
      const [tracks, playlists] = await Promise.all([getAllRecords('tracks'), getAllRecords('playlists')]);
      state.tracks = tracks.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      state.playlists = playlists.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      const known = new Set(state.tracks.map((track) => track.id));
      state.preferences.favorites = state.preferences.favorites.filter((id) => known.has(id));
      state.preferences.history = state.preferences.history.filter((id) => known.has(id));
      if (!known.has(state.preferences.lastTrackId)) {
        state.preferences.lastTrackId = null;
        state.preferences.lastPosition = 0;
      }
      savePreferences();
      renderAll();
      if (state.preferences.lastTrackId) {
        const queue = state.tracks.map((track) => track.id);
        await activateTrack(state.preferences.lastTrackId, queue, { autoplay: false, position: state.preferences.lastPosition });
      }
      refreshStorageInfo();
    } catch (error) {
      renderAll();
      showToast(error.message || 'Le stockage local n’est pas accessible.', true);
    }
  }

  bindEvents();
  updateConnectionBadge();
  updateInstallButtons();
  registerServiceWorker();
  loadApp();
})();
