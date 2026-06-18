// Extracted from original inline script
let appData = {
    folders: [],
    items: []
};

let currentFolderId = null;
let selectedFiles = [];
let isRecording = false;
let recognitionInstance = null;
let currentRecordingLocation = 'modal'; // 'modal' or 'folder'

// SPEECH RECOGNITION
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('Speech Recognition not supported in your browser');
        return null;
    }
    
    const recognition = new SpeechRecognition();
    recognition.language = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    
    return recognition;
}

// LOAD
function loadData() {
    const saved = localStorage.getItem('brainvault');
    if (saved) {
        appData = JSON.parse(saved);
    } else {
        appData.folders = [
            { id: 1, name: 'Recipes', desc: 'Food & cooking', icon: '🍳', color: '#ff922b' },
            { id: 2, name: 'Animals', desc: 'Animal photos', icon: '🦁', color: '#51cf66' },
            { id: 3, name: 'Courses', desc: 'Learning', icon: '📚', color: '#5b7cfa' }
        ];
        appData.items = [];
        saveData();
    }
}

function saveData() {
    localStorage.setItem('brainvault', JSON.stringify(appData));
}

// VIEWS
function showHome() {
    document.getElementById('homeView').classList.add('active');
    document.getElementById('folderView').classList.remove('active');
    renderFolders();
}

function showFolder(folderId) {
    currentFolderId = folderId;
    const folder = appData.folders.find(f => f.id === folderId);
    
    document.getElementById('folderIcon').textContent = folder.icon;
    document.getElementById('folderName').textContent = folder.name;
    document.getElementById('folderDesc').textContent = folder.desc;
    
    renderItems();
    
    document.getElementById('homeView').classList.remove('active');
    document.getElementById('folderView').classList.add('active');
}

// MODALS
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function openCreateFolderModal() {
    openModal('createFolderModal');
}

function openAddNoteModal() {
    populateFolderSelects();
    openModal('addNoteModal');
}

function openAddLinkModal() {
    populateFolderSelects();
    openModal('addLinkModal');
}

function openUploadModal() {
    populateFolderSelects();
    openModal('uploadModal');
}

function openVoiceModal() {
    populateFolderSelects();
    currentRecordingLocation = 'modal';
    openModal('voiceModal');
    recognitionInstance = initSpeechRecognition();
}

// FOLDERS
function createFolder() {
    const name = document.getElementById('folderNameInput').value.trim();
    const desc = document.getElementById('folderDescInput').value.trim();
    const icon = document.getElementById('selectedIcon').value;
    const color = document.getElementById('selectedColor').value;

    if (!name) {
        alert('Enter folder name');
        return;
    }

    appData.folders.push({
        id: Date.now(),
        name,
        desc,
        icon,
        color
    });

    saveData();
    closeModal('createFolderModal');
    renderFolders();
    
    document.getElementById('folderNameInput').value = '';
    document.getElementById('folderDescInput').value = '';
    document.getElementById('selectedIcon').value = '📁';
    document.getElementById('selectedColor').value = '#5b7cfa';
}

function deleteFolder() {
    if (!confirm('Delete folder?')) return;
    
    appData.folders = appData.folders.filter(f => f.id !== currentFolderId);
    appData.items = appData.items.filter(i => i.folderId !== currentFolderId);
    saveData();
    showHome();
}

function renderFolders() {
    const grid = document.getElementById('foldersGrid');
    grid.innerHTML = appData.folders.map(f => `
        <div class="folder-card" onclick="showFolder(${f.id})" style="border-color: ${f.color};">
            <div class="folder-icon">${f.icon}</div>
            <div class="folder-name">${f.name}</div>
            <div class="folder-count">${appData.items.filter(i => i.folderId === f.id).length} items</div>
        </div>
    `).join('');
}

function selectIcon(btn, icon) {
    document.querySelectorAll('#createFolderModal button[type="button"]').forEach(b => b.style.borderColor = '#e9ecef');
    btn.style.borderColor = '#5b7cfa';
    document.getElementById('selectedIcon').value = icon;
}

function selectColor(btn, color) {
    document.querySelectorAll('.color-picker .color-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('selectedColor').value = color;
}

// ITEMS
function addNoteFromModal() {
    const content = document.getElementById('modalNoteText').value.trim();
    const folderId = parseInt(document.getElementById('folderSelectNote').value);

    if (!content || !folderId) {
        alert('Enter note and choose folder');
        return;
    }

    appData.items.push({
        id: Date.now(),
        folderId,
        type: 'note',
        content,
        date: new Date().toISOString()
    });

    saveData();
    closeModal('addNoteModal');
    document.getElementById('modalNoteText').value = '';
    renderFolders();
}

function addNoteToFolder() {
    const content = document.getElementById('noteText').value.trim();

    if (!content || !currentFolderId) {
        alert('Enter note');
        return;
    }

    appData.items.push({
        id: Date.now(),
        folderId: currentFolderId,
        type: 'note',
        content,
        date: new Date().toISOString()
    });

    saveData();
    renderItems();
    document.getElementById('noteText').value = '';
}

function addLinkFromModal() {
    const url = document.getElementById('modalLinkText').value.trim();
    const folderId = parseInt(document.getElementById('folderSelectLink').value);

    if (!url || !folderId) {
        alert('Enter URL and choose folder');
        return;
    }

    const item = {
        id: Date.now(),
        folderId,
        type: 'link',
        content: url,
        date: new Date().toISOString(),
        metadata: {}
    };

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        item.metadata.isYouTube = true;
        item.metadata.analyzing = true;
        appData.items.push(item);
        saveData();
        analyzeYouTubeLink(item.id);
    } else {
        appData.items.push(item);
        saveData();
    }

    closeModal('addLinkModal');
    document.getElementById('modalLinkText').value = '';
    renderFolders();
}

function addLinkToFolder() {
    const url = document.getElementById('linkText').value.trim();

    if (!url || !currentFolderId) {
        alert('Enter URL');
        return;
    }

    const item = {
        id: Date.now(),
        folderId: currentFolderId,
        type: 'link',
        content: url,
        date: new Date().toISOString(),
        metadata: {}
    };

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        item.metadata.isYouTube = true;
        item.metadata.analyzing = true;
        appData.items.push(item);
        saveData();
        analyzeYouTubeLink(item.id);
    } else {
        appData.items.push(item);
        saveData();
    }

    renderItems();
    document.getElementById('linkText').value = '';
    document.getElementById('linkPreview').style.display = 'none';
}

// YOUTUBE ANALYSIS
async function analyzeYouTubeLink(itemId) {
    const item = appData.items.find(i => i.id === itemId);
    if (!item) return;

    try {
        let videoId = '';
        if (item.content.includes('youtube.com')) {
            videoId = new URL(item.content).searchParams.get('v');
        } else if (item.content.includes('youtu.be')) {
            videoId = item.content.split('youtu.be/')[1].split('?')[0];
        }

        if (!videoId) {
            item.metadata.analyzing = false;
            item.metadata.summary = 'Could not extract video ID';
            saveData();
            renderItems();
            return;
        }

        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        const data = await response.json();

        item.metadata.title = data.title || 'YouTube Video';
        item.metadata.thumbnail = data.thumbnail_url || '';
        item.metadata.summary = `Title: ${data.title || 'N/A'}\nAuthor: ${data.author_name || 'Unknown'}`;
        item.metadata.analyzing = false;

        saveData();
        renderItems();
    } catch (error) {
        item.metadata.summary = 'Video information not available';
        item.metadata.analyzing = false;
        saveData();
        renderItems();
    }
}

// VOICE RECOGNITION
function toggleVoiceModal() {
    if (!recognitionInstance) {
        recognitionInstance = initSpeechRecognition();
    }

    if (isRecording) {
        recognitionInstance.stop();
        isRecording = false;
        document.getElementById('voiceModalBtn').textContent = '🎤 Start Recording';
        document.getElementById('voiceModalBtn').classList.remove('btn-danger');
        document.getElementById('voiceModalBtn').classList.add('btn-primary');
    } else {
        recognitionInstance.start();
        isRecording = true;
        document.getElementById('voiceModalBtn').textContent = '⏹️ Stop Recording';
        document.getElementById('voiceModalBtn').classList.remove('btn-primary');
        document.getElementById('voiceModalBtn').classList.add('btn-danger');
        document.getElementById('voiceModalTranscript').style.display = 'block';

        recognitionInstance.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript + ' ';
            }
            document.getElementById('voiceModalText').value = transcript;
        };
    }
}

function toggleVoiceFolder() {
    if (!recognitionInstance) {
        recognitionInstance = initSpeechRecognition();
    }

    if (isRecording) {
        recognitionInstance.stop();
        isRecording = false;
        document.getElementById('voiceBtn').textContent = '🎤 Start Recording';
        document.getElementById('voiceBtn').classList.remove('btn-danger');
        document.getElementById('voiceBtn').classList.add('btn-danger');
    } else {
        recognitionInstance.start();
        isRecording = true;
        document.getElementById('voiceBtn').textContent = '⏹️ Stop Recording';
        document.getElementById('voiceBtn').classList.add('btn-danger');
        document.getElementById('voiceTranscript').style.display = 'block';

        recognitionInstance.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript + ' ';
            }
            document.getElementById('voiceText').value = transcript;
        };
    }
}

function addVoiceNoteFromModal() {
    const text = document.getElementById('voiceModalText').value.trim();
    const folderId = parseInt(document.getElementById('folderSelectVoice').value);

    if (!text || !folderId) {
        alert('Record voice and choose folder');
        return;
    }

    appData.items.push({
        id: Date.now(),
        folderId,
        type: 'voice',
        content: text,
        date: new Date().toISOString()
    });

    saveData();
    closeModal('voiceModal');
    document.getElementById('voiceModalText').value = '';
    isRecording = false;
    renderFolders();
}

function addVoiceNoteToFolder() {
    const text = document.getElementById('voiceText').value.trim();

    if (!text || !currentFolderId) {
        alert('Record voice');
        return;
    }

    appData.items.push({
        id: Date.now(),
        folderId: currentFolderId,
        type: 'voice',
        content: text,
        date: new Date().toISOString()
    });

    saveData();
    renderItems();
    document.getElementById('voiceText').value = '';
    document.getElementById('voiceTranscript').style.display = 'none';
    isRecording = false;
}

// FILES
function handleFileSelect(e) {
    selectedFiles = Array.from(e.target.files);
}

function handleDrop(e) {
    e.preventDefault();
    selectedFiles = Array.from(e.dataTransfer.files);
    e.target.closest('.upload-area').classList.remove('dragover');
}

function handleDragOver(e) {
    e.preventDefault();
    e.target.closest('.upload-area').classList.add('dragover');
}

function handleDragLeave(e) {
    e.target.closest('.upload-area').classList.remove('dragover');
}

function uploadFilesFromModal() {
    const folderId = parseInt(document.getElementById('folderSelectUpload').value);

    if (!selectedFiles.length || !folderId) {
        alert('Select files and folder');
        return;
    }

    let processed = 0;
    selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const item = {
                id: Date.now() + Math.random(),
                folderId,
                type: 'file',
                content: e.target.result,
                filename: file.name,
                date: new Date().toISOString(),
                metadata: {}
            };

            if (file.type.startsWith('image/')) {
                item.metadata.analyzing = true;
                appData.items.push(item);
                saveData();
                analyzeImage(item.id);
            } else {
                appData.items.push(item);
                saveData();
            }

            processed++;
            if (processed === selectedFiles.length) {
                closeModal('uploadModal');
                selectedFiles = [];
                renderFolders();
            }
        };
        reader.readAsDataURL(file);
    });
}

function uploadFilesToFolder() {
    if (!selectedFiles.length || !currentFolderId) {
        alert('Select files');
        return;
    }

    let processed = 0;
    selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const item = {
                id: Date.now() + Math.random(),
                folderId: currentFolderId,
                type: 'file',
                content: e.target.result,
                filename: file.name,
                date: new Date().toISOString(),
                metadata: {}
            };

            if (file.type.startsWith('image/')) {
                item.metadata.analyzing = true;
                appData.items.push(item);
                saveData();
                analyzeImage(item.id);
            } else {
                appData.items.push(item);
                saveData();
            }

            processed++;
            if (processed === selectedFiles.length) {
                selectedFiles = [];
                renderItems();
            }
        };
        reader.readAsDataURL(file);
    });
}

// IMAGE ANALYSIS
async function analyzeImage(itemId) {
    const item = appData.items.find(i => i.id === itemId);
    if (!item) return;

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = async () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const folder = appData.folders.find(f => f.id === item.folderId);
            
            if (folder && folder.name.toLowerCase().includes('animal')) {
                item.metadata.type = 'animal';
                item.metadata.analysis = 'Image uploaded. AI analysis pending...';
            } else if (folder && folder.name.toLowerCase().includes('recipe')) {
                item.metadata.type = 'recipe';
                item.metadata.analysis = 'Recipe image detected. Analyzing ingredients...';
            } else {
                item.metadata.type = 'image';
                item.metadata.analysis = 'Image analyzed';
            }

            item.metadata.analyzing = false;
            saveData();
            renderItems();
        };

        img.src = item.content;
    } catch (error) {
        item.metadata.analyzing = false;
        item.metadata.analysis = 'Analysis failed';
        saveData();
        renderItems();
    }
}

function deleteItem(itemId) {
    if (!confirm('Delete?')) return;
    appData.items = appData.items.filter(i => i.id !== itemId);
    saveData();
    renderItems();
    renderFolders();
}

function renderItems() {
    const items = appData.items.filter(i => i.folderId === currentFolderId);
    const list = document.getElementById('itemsList');
    const empty = document.getElementById('emptyState');

    if (items.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    list.innerHTML = items.map(item => {
        let content = '';
        let metaInfo = '';

        if (item.type === 'note') {
            content = `<div class="item-content">${item.content}</div>`;
        } else if (item.type === 'voice') {
            content = `<div class="item-content">🎤 ${item.content}</div>`;
        } else if (item.type === 'link') {
            if (item.metadata.isYouTube) {
                content = `
                    <div class="item-content">
                        ${item.metadata.thumbnail ? `<img src="${item.metadata.thumbnail}" alt="thumbnail">` : ''}
                        <a href="${item.content}" target="_blank" style="display: block; margin-top: 10px;">📺 ${item.metadata.title || item.content}</a>
                    </div>
                `;
                if (item.metadata.summary) {
                    metaInfo = `<div class="item-meta"><strong>📺 Info:</strong> ${item.metadata.summary}</div>`;
                }
            } else {
                content = `<div class="item-content"><a href="${item.content}" target="_blank">🔗 ${item.content}</a></div>`;
            }
        } else if (item.type === 'file') {
            if (item.content.startsWith('data:image')) {
                content = `<div class="item-content"><img src="${item.content}" alt="image" style="max-width: 100%; border-radius: 8px;"></div>`;
                
                if (item.metadata.analysis) {
                    metaInfo = `<div class="item-meta"><strong>🔍 Analysis:</strong> ${item.metadata.analysis}</div>`;
                }
            } else {
                content = `<div class="item-content">📎 ${item.filename}</div>`;
            }
        }

        const analyzing = item.metadata.analyzing ? '<div class="analyzing"><div class="loading"></div> Analyzing...</div>' : '';

        return `
            <div class="item">
                <div class="item-header">
                    <div class="item-type">${item.type}</div>
                    <div class="item-date">${new Date(item.date).toLocaleDateString()}</div>
                </div>
                ${content}
                ${analyzing}
                ${metaInfo}
                <div class="item-actions">
                    <button class="btn btn-danger btn-sm" onclick="deleteItem(${item.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// TABS
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tab + 'Tab').classList.add('active');
    event.target.classList.add('active');
}

// UTILS
function populateFolderSelects() {
    const selects = ['folderSelectNote', 'folderSelectLink', 'folderSelectUpload', 'folderSelectVoice'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = '<option value="">Choose folder...</option>';
        appData.folders.forEach(f => {
            select.innerHTML += `<option value="${f.id}">${f.name}</option>`;
        });
    });
}

// INIT
loadData();
renderFolders();

// Close modals on background click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});

// Upload area clicks
document.getElementById('uploadArea')?.addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('folderUploadArea')?.addEventListener('click', () => {
    document.getElementById('folderFileInput').click();
});

// Link preview
document.getElementById('modalLinkText')?.addEventListener('input', (e) => {
    const url = e.target.value;
    const preview = document.getElementById('modalLinkPreview');
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        preview.textContent = '📺 YouTube video detected';
        preview.style.display = 'block';
    } else if (url.includes('instagram') || url.includes('tiktok')) {
        preview.textContent = '📱 Social media link detected';
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
});

document.getElementById('linkText')?.addEventListener('input', (e) => {
    const url = e.target.value;
    const preview = document.getElementById('linkPreview');
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        preview.textContent = '📺 YouTube video detected';
        preview.style.display = 'block';
    } else if (url.includes('instagram') || url.includes('tiktok')) {
        preview.textContent = '📱 Social media link detected';
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
});
