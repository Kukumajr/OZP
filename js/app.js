// ===== GLOBALS =====
let organizationsData = null;
let sheetsData = null;
let notificationsData = null;
let currentPeriod = '2025-2026';
let currentView = 'dashboard'; // 'dashboard' | 'detail'
let currentOrgId = null;
let currentOrgType = null; // 'omsu' | 'eto' | 'tso' | 'object'

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    renderTree();
    renderNotifications();

    // По умолчанию показываем дашборд первого ОМСУ
    if (organizationsData && organizationsData.omsu_list.length > 0) {
        const firstOmsu = organizationsData.omsu_list[0];
        showDashboard('omsu', firstOmsu.id, firstOmsu.name);
    }
});

// ===== DATA LOADING =====
async function loadAllData() {
    try {
        // Загрузка всех JSON файлов с добавлением параметра для обхода кеша
        const timestamp = Date.now();
        const [orgs, sheets, notifs] = await Promise.all([
            fetch(`data/organizations.json?v=${timestamp}`).then(r => r.json()),
            fetch(`data/sheets.json?v=${timestamp}`).then(r => r.json()),
            fetch(`data/notifications.json?v=${timestamp}`).then(r => r.json())
        ]);

        organizationsData = orgs;
        sheetsData = sheets.sheets;
        notificationsData = notifs;

        console.log('Data loaded successfully');
        console.log('Total sheets loaded:', sheetsData.length);
        console.log('Object sheets with items:', sheetsData.filter(s => s.entity_type === 'object' && s.items).length);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// ===== TREE RENDERING =====
function renderTree() {
    const treeContainer = document.querySelector('.tree');
    if (!treeContainer || !organizationsData) return;

    let html = '';

    // Проходим по всем ОМСУ
    organizationsData.omsu_list.forEach(omsu => {
        const omsuObjectsCount = countObjects(omsu);

        html += `
            <div class="tree-item expanded">
                <div class="tree-node" data-id="${omsu.id}" data-type="omsu" onclick="handleTreeClick(event, '${omsu.id}', 'omsu', '${omsu.name}')">
                    <span class="tree-toggle">▶</span>
                    <svg class="tree-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                    <span class="tree-label">${omsu.name} (ОМСУ)</span>
                    <span class="tree-badge">${omsuObjectsCount}</span>
                </div>
                <div class="tree-children">
                    ${renderEtoList(omsu.eto_list)}
                </div>
            </div>
        `;
    });

    treeContainer.innerHTML = html;
}

function renderEtoList(etoList) {
    let html = '';

    etoList.forEach(eto => {
        const etoObjectsCount = countObjects(eto);

        html += `
            <div class="tree-item">
                <div class="tree-node" data-id="${eto.id}" data-type="eto" onclick="handleTreeClick(event, '${eto.id}', 'eto', '${eto.name}')">
                    <span class="tree-toggle">▶</span>
                    <svg class="tree-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span class="tree-label">${eto.name}</span>
                    <span class="tree-badge">${etoObjectsCount}</span>
                </div>
                <div class="tree-children">
                    ${renderTsoList(eto.tso_list)}
                </div>
            </div>
        `;
    });

    return html;
}

function renderTsoList(tsoList) {
    let html = '';

    tsoList.forEach(tso => {
        html += `
            <div class="tree-item">
                <div class="tree-node" data-id="${tso.id}" data-type="tso" onclick="handleTreeClick(event, '${tso.id}', 'tso', '${tso.name}')">
                    <svg class="tree-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                    <span class="tree-label">${tso.name}</span>
                    <span class="tree-badge">${tso.objects.length}</span>
                </div>
            </div>
        `;
    });

    return html;
}

// ===== TREE NAVIGATION =====
function handleTreeClick(event, id, type, name) {
    // Остановить всплытие для toggle
    if (event.target.classList.contains('tree-toggle')) {
        event.stopPropagation();
        const item = event.target.closest('.tree-item');
        item.classList.toggle('expanded');
        return;
    }

    // Убрать active со всех nodes
    document.querySelectorAll('.tree-node').forEach(node => {
        node.classList.remove('active');
    });

    // Добавить active к текущему
    event.currentTarget.classList.add('active');

    // Показать дашборд для ОМСУ, ЕТО или ТСО
    showDashboard(type, id, name);
}

// ===== UTILS =====
function countObjects(org) {
    let count = 0;

    if (org.eto_list) {
        // ОМСУ
        org.eto_list.forEach(eto => {
            count += countObjects(eto);
        });
    } else if (org.tso_list) {
        // ЕТО
        org.tso_list.forEach(tso => {
            count += tso.objects.length;
        });
    } else if (org.objects) {
        // ТСО
        count = org.objects.length;
    }

    return count;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // секунды

    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} часов назад`;
    if (diff < 172800) return 'вчера';

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

function getFileType(filename) {
    const ext = filename.split('.').pop().toUpperCase();
    return ext;
}

// ===== PERIOD FILTER =====
function filterByPeriod(period) {
    currentPeriod = period;
    console.log('Период изменен:', period);

    // Перерисовать текущий вид
    if (currentView === 'dashboard') {
        showDashboard(currentOrgType, currentOrgId, getCurrentOrgName());
    } else if (currentView === 'detail') {
        // Reload current sheet
        location.reload();
    }
}

function getCurrentOrgName() {
    // TODO: Получить название организации по ID
    return 'Организация';
}