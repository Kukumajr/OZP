// ===== SHEET DETAIL =====

let currentSheetData = null;
let currentScrollToItem = null;

function showSheetDetail(sheetId, itemNumber = null) {
    console.log('showSheetDetail called with:', sheetId);
    currentView = 'detail';
    currentScrollToItem = itemNumber;

    // Найти sheet в данных
    currentSheetData = sheetsData.find(s => s.id === sheetId);
    console.log('Found sheet:', currentSheetData);

    if (!currentSheetData) {
        console.error('Sheet not found:', sheetId);
        return;
    }

    // Если у sheet нет items, создать их
    if (!currentSheetData.items) {
        console.log('Generating items for sheet');
        currentSheetData.items = generateSheetItems(currentSheetData);
        console.log('Generated items:', currentSheetData.items.length);
    }

    // Скрыть дашборд и реестр
    document.getElementById('dashboardView').classList.remove('active');
    const registryView = document.getElementById('registryView');
    if (registryView) registryView.classList.remove('active');

    // Показать детальный вид
    const detailView = document.getElementById('detailView');
    detailView.classList.add('active');

    // Обновить header
    updateDetailHeader();

    // Отрисовать метаданные
    renderDetailMeta();

    // Отрисовать таблицу пунктов
    renderItemsTable();

    // Прокрутить к нужному пункту если указан
    if (itemNumber) {
        setTimeout(() => scrollToItem(itemNumber), 300);
    }

    window.scrollTo(0, 0);
}

function updateDetailHeader() {
    const title = document.querySelector('#detailView .main-header h1');
    const breadcrumbLink = document.querySelector('.detail-breadcrumb a');
    const breadcrumbText = document.querySelector('.detail-breadcrumb span:last-child');

    title.textContent = `${currentSheetData.object_name} за период ${currentSheetData.period}`;

    // Breadcrumb
    breadcrumbLink.textContent = `← ${currentSheetData.eto_name}`;
    breadcrumbLink.onclick = () => {
        showDashboard('eto', currentSheetData.eto_id, currentSheetData.eto_name);
        return false;
    };
    breadcrumbText.textContent = `ОЛ-${currentSheetData.id}`;
}

function renderDetailMeta() {
    // Обновить метаданные в header
    document.querySelector('#detailView [data-meta="sheet-id"] .detail-meta-value').textContent = `ОЛ-${currentSheetData.id}`;
    document.querySelector('#detailView [data-meta="created"] .detail-meta-value').textContent = new Date(currentSheetData.created_at).toLocaleDateString('ru-RU');
    document.querySelector('#detailView [data-meta="index"] .detail-meta-value').textContent = currentSheetData.index;
    document.querySelector('#detailView [data-meta="docs"] .detail-meta-value').textContent = `${currentSheetData.docs_approved} из ${currentSheetData.docs_total}`;

    // Progress bar
    document.querySelector('#detailView .progress-label-value').textContent = currentSheetData.progress + '%';
    document.querySelector('#detailView .progress-fill').style.width = currentSheetData.progress + '%';
}

function renderItemsTable() {
    const tbody = document.querySelector('#detailView .tree-table tbody');
    console.log('renderItemsTable - tbody found:', !!tbody);

    if (!tbody) {
        console.error('tbody not found in #detailView!');
        return;
    }

    if (!currentSheetData.items) {
        console.error('No items in currentSheetData!');
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Пункты оценочного листа не найдены</td></tr>';
        return;
    }

    let html = '';

    currentSheetData.items.forEach(item => {
        html += renderTreeRow(item);
    });

    tbody.innerHTML = html;

    // Обновить счетчики фильтров
    updateFilterCounts();
}

function renderTreeRow(item) {
    const indent = item.level * 20;
    const toggleClass = item.has_children ? 'tree-row-toggle' : 'tree-row-toggle empty';
    const rowClass = item.has_children ? 'tree-row has-children' : 'tree-row';
    const filesIcon = item.files_count > 0 ? 'has-content' : '';

    return `
        <tr class="${rowClass}" data-item="${item.number}" data-level="${item.level}">
            <td>
                <div class="tree-cell-content" style="padding-left: ${indent}px">
                    <span class="${toggleClass}" onclick="toggleTreeRow(this)">▶</span>
                    <span class="tree-row-number">${item.number}</span>
                </div>
            </td>
            <td>
                <div class="tree-row-title">${item.title}</div>
            </td>
            <td>
                <div class="files-cell drop-zone"
                     data-item-id="${item.id}"
                     data-item-number="${item.number}"
                     ondragover="handleDragOver(event)"
                     ondragleave="handleDragLeave(event)"
                     ondrop="handleFileDrop(event)"
                     onclick="handleDropZoneClick(event, '${item.id}', '${item.number}', ${item.files_count})">
                    ${item.files_count > 0 ? `
                        <span class="icon-badge ${filesIcon}">
                            📎 ${item.files_count}
                        </span>
                    ` : `
                        <span class="drop-hint">📎</span>
                    `}
                    <button class="btn-upload-image" onclick="event.stopPropagation(); uploadImageToItem('${item.id}', '${item.number}')" title="Добавить файлы">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                    </button>
                </div>
            </td>
            <td>${renderStatusChain(item.status)}</td>
            <td>${item.score !== null ? `<strong>${item.score}</strong>` : '-'}</td>
            <td>
                <button class="action-btn" onclick="openCommentsModal('${item.id}', '${item.number}')">
                    💬 ${item.comments_count}
                </button>
            </td>
        </tr>
    `;
}

function renderStatusChain(status) {
    const steps = ['tso', 'eto', 'omsu', 'commission'];
    const names = {
        'tso': 'ТСО',
        'eto': 'ЕТО',
        'omsu': 'ОМСУ',
        'commission': 'Комиссия'
    };

    let html = '<div class="status-chain">';

    steps.forEach((step, index) => {
        const stepStatus = status[step] || 'pending';
        html += `<span class="status-step ${stepStatus}">${names[step]}</span>`;
        if (index < steps.length - 1) {
            html += '<span class="status-arrow">→</span>';
        }
    });

    html += '</div>';
    return html;
}

function toggleTreeRow(toggle) {
    const row = toggle.closest('.tree-row');
    row.classList.toggle('expanded');

    // Показать/скрыть дочерние строки
    const level = parseInt(row.dataset.level);
    let nextRow = row.nextElementSibling;

    while (nextRow && nextRow.classList.contains('tree-row')) {
        const nextLevel = parseInt(nextRow.dataset.level);

        if (nextLevel <= level) break;

        if (nextLevel === level + 1) {
            nextRow.style.display = row.classList.contains('expanded') ? 'table-row' : 'none';
        } else if (!row.classList.contains('expanded')) {
            nextRow.style.display = 'none';
        }

        nextRow = nextRow.nextElementSibling;
    }
}

function scrollToItem(itemNumber) {
    const row = document.querySelector(`[data-item="${itemNumber}"]`);
    if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.background = 'var(--warning-light)';
        setTimeout(() => {
            row.style.background = '';
        }, 2000);
    }
}

// ===== MODALS =====
function openFilesModal(itemId) {
    const item = findItemById(itemId);
    if (!item) return;

    const modal = document.getElementById('filesModal');
    const modalTitle = modal.querySelector('.modal-header h3');
    const modalBody = modal.querySelector('.modal-body');
    const modalFooter = modal.querySelector('.modal-footer');

    modalTitle.textContent = `Документы к пункту ${item.number}`;

    let html = '';

    if (item.files && item.files.length > 0) {
        html += '<div class="files-list">';

        item.files.forEach(file => {
            const fileType = getFileType(file.name);
            html += `
                <div class="file-item">
                    <div class="file-icon">${fileType}</div>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">${formatFileSize(file.size)} • Загружен ${new Date(file.uploaded_at).toLocaleDateString('ru-RU')}</div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
    } else {
        html += '<div class="empty-state">Файлов пока нет</div>';
    }

    modalBody.innerHTML = html;

    // Добавить кнопку загрузки файлов в footer
    modalFooter.innerHTML = `
        <button class="btn btn-primary" onclick="closeModal('filesModal'); openUploadModal('${itemId}', '${item.number}')">
            Добавить файлы
        </button>
        <button class="btn btn-secondary" onclick="closeModal('filesModal')">Закрыть</button>
    `;

    modal.classList.add('active');
}

function openCommentsModal(itemId, itemNumber) {
    const item = findItemById(itemId);
    if (!item) return;

    const modal = document.getElementById('commentsModal');
    const modalTitle = modal.querySelector('.modal-header h3');
    const modalBody = modal.querySelector('.modal-body');

    modalTitle.textContent = `Комментарии к пункту ${itemNumber}`;

    let html = '';

    if (item.comments && item.comments.length > 0) {
        html += '<div class="comments-list">';

        item.comments.forEach(comment => {
            const systemClass = comment.is_system ? 'system' : '';
            html += `
                <div class="comment-item ${systemClass}">
                    <div class="comment-header">
                        <span class="comment-author">${comment.author} (${comment.author_role})</span>
                        <span class="comment-time">${new Date(comment.created_at).toLocaleString('ru-RU')}</span>
                    </div>
                    <div class="comment-text">${comment.text}</div>
                </div>
            `;
        });

        html += '</div>';
    } else {
        html += '<div class="empty-state">Комментариев пока нет</div>';
    }

    modalBody.innerHTML = html;
    modal.classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function findItemById(itemId) {
    if (!currentSheetData || !currentSheetData.items) return null;
    return currentSheetData.items.find(item => item.id === itemId);
}

// Закрытие модалок по клику на overlay
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ===== UPLOAD IMAGE =====
function uploadImageToItem(itemId, itemNumber) {
    // Открыть модальное окно загрузки
    openUploadModal(itemId, itemNumber);
}

// ===== FILTERS =====
let currentFilter = 'all';

function updateFilterCounts() {
    if (!currentSheetData || !currentSheetData.items) return;

    const items = currentSheetData.items;

    // Подсчет по категориям
    const counts = {
        all: items.length,
        noFiles: items.filter(item => item.files_count === 0).length,
        noScore: items.filter(item => item.score === null).length,
        pending: items.filter(item => hasPendingStatus(item.status)).length,
        issues: items.filter(item => hasRejectedStatus(item.status)).length,
        completed: items.filter(item => isCompleted(item)).length
    };

    // Обновить UI
    document.getElementById('filterCountAll').textContent = counts.all;
    document.getElementById('filterCountNoFiles').textContent = counts.noFiles;
    document.getElementById('filterCountNoScore').textContent = counts.noScore;
    document.getElementById('filterCountPending').textContent = counts.pending;
    document.getElementById('filterCountIssues').textContent = counts.issues;
    document.getElementById('filterCountCompleted').textContent = counts.completed;
}

function filterSheetItems(filter) {
    currentFilter = filter;

    // Обновить активную кнопку
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

    // Показать/скрыть строки
    const rows = document.querySelectorAll('.tree-table tbody tr');
    rows.forEach(row => {
        const itemNumber = row.dataset.item;
        if (!itemNumber) return;

        const item = findItemByNumber(itemNumber);
        if (!item) return;

        let shouldShow = false;

        switch(filter) {
            case 'all':
                shouldShow = true;
                break;
            case 'no-files':
                shouldShow = item.files_count === 0;
                break;
            case 'no-score':
                shouldShow = item.score === null;
                break;
            case 'pending':
                shouldShow = hasPendingStatus(item.status);
                break;
            case 'issues':
                shouldShow = hasRejectedStatus(item.status);
                break;
            case 'completed':
                shouldShow = isCompleted(item);
                break;
        }

        row.style.display = shouldShow ? 'table-row' : 'none';
    });
}

function hasPendingStatus(status) {
    return status.tso === 'active' || status.eto === 'active' ||
           status.omsu === 'active' || status.commission === 'active';
}

function hasRejectedStatus(status) {
    return status.tso === 'rejected' || status.eto === 'rejected' ||
           status.omsu === 'rejected' || status.commission === 'rejected';
}

function isCompleted(item) {
    return item.files_count > 0 &&
           item.score !== null &&
           item.status.tso === 'completed' &&
           item.status.eto === 'completed' &&
           item.status.omsu === 'completed' &&
           item.status.commission === 'completed';
}

function findItemByNumber(itemNumber) {
    if (!currentSheetData || !currentSheetData.items) return null;
    return currentSheetData.items.find(item => item.number === itemNumber);
}

// ===== DRAG & DROP =====
let currentUploadItemId = null;
let currentUploadItemNumber = null;
let selectedFiles = [];

function handleDropZoneClick(event, itemId, itemNumber, filesCount) {
    event.stopPropagation();

    // Если есть файлы, открыть модальное окно просмотра
    if (filesCount > 0) {
        openFilesModal(itemId);
    } else {
        // Если файлов нет, открыть модальное окно загрузки
        openUploadModal(itemId, itemNumber);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = event.currentTarget;
    dropZone.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = event.currentTarget;

    // Проверить, что мышь действительно покинула зону
    const rect = dropZone.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
        dropZone.classList.remove('drag-over');
    }
}

function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropZone = event.currentTarget;
    dropZone.classList.remove('drag-over');

    const itemId = dropZone.dataset.itemId;
    const itemNumber = dropZone.dataset.itemNumber;
    const files = event.dataTransfer.files;

    if (files.length === 0) return;

    openUploadModal(itemId, itemNumber, files);
}

// ===== UPLOAD MODAL =====
function openUploadModal(itemId, itemNumber, files = null) {
    currentUploadItemId = itemId;
    currentUploadItemNumber = itemNumber;
    selectedFiles = [];

    const modal = document.getElementById('uploadModal');
    const modalTitle = modal.querySelector('.modal-header h3');
    modalTitle.textContent = `Загрузка файлов к пункту ${itemNumber}`;

    const modalBody = modal.querySelector('.modal-body');

    // Добавить кнопку "Добавить из реестра" после upload-area
    const uploadArea = modalBody.querySelector('.upload-area');
    let registryButton = modalBody.querySelector('.btn-add-from-registry');

    if (!registryButton) {
        registryButton = document.createElement('button');
        registryButton.className = 'btn btn-secondary btn-add-from-registry';
        registryButton.style.cssText = 'width: 100%; margin-top: 16px; margin-bottom: 16px;';
        registryButton.innerHTML = `
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right: 8px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Добавить из реестра документов
        `;
        registryButton.onclick = () => openRegistryFileSelector();
        uploadArea.parentNode.insertBefore(registryButton, uploadArea.nextSibling);
    }

    // Очистить предпросмотр
    document.getElementById('filesPreview').innerHTML = '';
    document.getElementById('uploadButton').disabled = true;

    // Если файлы переданы, добавить их
    if (files && files.length > 0) {
        addFilesToPreview(files);
    }

    modal.classList.add('active');
    setupUploadAreaHandlers();
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.classList.remove('active');
    selectedFiles = [];
    currentUploadItemId = null;
    currentUploadItemNumber = null;

    // Сбросить прогресс
    document.getElementById('uploadProgress').classList.remove('active');
    document.getElementById('uploadProgressFill').style.width = '0%';
}

function setupUploadAreaHandlers() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    // Обработчики drag & drop для области загрузки
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('drag-active');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = uploadArea.getBoundingClientRect();
        if (e.clientX <= rect.left || e.clientX >= rect.right ||
            e.clientY <= rect.top || e.clientY >= rect.bottom) {
            uploadArea.classList.remove('drag-active');
        }
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('drag-active');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            addFilesToPreview(files);
        }
    });

    // Обработчик для input file
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            addFilesToPreview(files);
        }
        // Сбросить input для повторного выбора тех же файлов
        e.target.value = '';
    });
}

function addFilesToPreview(files) {
    const filesArray = Array.from(files);

    filesArray.forEach(file => {
        // Проверить, не добавлен ли файл уже
        const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
        if (!exists) {
            selectedFiles.push(file);
        }
    });

    renderFilesPreview();
    updateUploadButton();
}

function renderFilesPreview() {
    const preview = document.getElementById('filesPreview');

    if (selectedFiles.length === 0) {
        preview.innerHTML = '';
        return;
    }

    let html = '';
    selectedFiles.forEach((file, index) => {
        const fileType = getFileTypeClass(file.name);
        const fileIcon = getFileIcon(file.name);

        html += `
            <div class="file-preview-item">
                <div class="file-preview-icon ${fileType}">${fileIcon}</div>
                <div class="file-preview-info">
                    <div class="file-preview-name">${file.name}</div>
                    <div class="file-preview-size">${formatFileSize(file.size)}</div>
                </div>
                <button class="file-preview-remove" onclick="removeFileFromPreview(${index})" title="Удалить">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `;
    });

    preview.innerHTML = html;
}

function removeFileFromPreview(index) {
    selectedFiles.splice(index, 1);
    renderFilesPreview();
    updateUploadButton();
}

function updateUploadButton() {
    const button = document.getElementById('uploadButton');
    button.disabled = selectedFiles.length === 0;
    button.textContent = selectedFiles.length > 0
        ? `Загрузить файлы (${selectedFiles.length})`
        : 'Загрузить файлы';
}

function getFileTypeClass(filename) {
    const ext = filename.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
        return 'image';
    } else if (ext === 'pdf') {
        return 'pdf';
    } else if (['doc', 'docx'].includes(ext)) {
        return 'doc';
    } else if (['xls', 'xlsx'].includes(ext)) {
        return 'excel';
    }
    return '';
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
        return '🖼️';
    } else if (ext === 'pdf') {
        return '📄';
    } else if (['doc', 'docx'].includes(ext)) {
        return '📝';
    } else if (['xls', 'xlsx'].includes(ext)) {
        return '📊';
    } else if (['zip', 'rar', '7z'].includes(ext)) {
        return '📦';
    }
    return '📎';
}

function confirmUpload() {
    if (selectedFiles.length === 0) return;

    const progressContainer = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('uploadProgressFill');
    const progressText = document.getElementById('uploadProgressText');
    const uploadButton = document.getElementById('uploadButton');

    // Показать прогресс
    progressContainer.classList.add('active');
    uploadButton.disabled = true;

    // Симуляция загрузки (в реальном приложении здесь будет AJAX запрос)
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressFill.style.width = progress + '%';
        progressText.textContent = `Загрузка файлов... ${progress}%`;

        if (progress >= 100) {
            clearInterval(interval);

            // Имитация успешной загрузки
            setTimeout(() => {
                // Обновить данные пункта
                updateItemFilesCount(currentUploadItemId, selectedFiles.length);

                // Показать уведомление
                progressText.textContent = `✓ Загружено ${selectedFiles.length} файл(ов)`;

                // Закрыть модальное окно через 1 секунду
                setTimeout(() => {
                    closeUploadModal();
                }, 1000);
            }, 500);
        }
    }, 200);
}

function updateItemFilesCount(itemId, newFilesCount) {
    // Найти пункт и обновить количество файлов
    const item = findItemById(itemId);
    if (item) {
        item.files_count += newFilesCount;

        // Обновить UI
        renderItemsTable();
        updateFilterCounts();
    }
}

// ===== HELPER FUNCTIONS =====

// Генерация пунктов оценочного листа
function generateSheetItems(sheetData) {
    // Базовый список пунктов для всех объектов
    return [
        {
            id: 'item-1',
            number: '1',
            title: 'Организационно-правовая документация',
            level: 0,
            has_children: true,
            files_count: 0,
            files: [],
            status: { tso: 'pending', eto: 'pending', omsu: 'pending', commission: 'pending' },
            score: null,
            comments_count: 0,
            comments: []
        },
        {
            id: 'item-1.1',
            number: '1.1',
            title: 'Устав организации',
            level: 1,
            has_children: false,
            files_count: Math.floor(Math.random() * 3),
            files: [],
            status: { tso: 'completed', eto: 'completed', omsu: 'active', commission: 'pending' },
            score: Math.random() > 0.5 ? Math.floor(Math.random() * 10) + 1 : null,
            comments_count: Math.floor(Math.random() * 3),
            comments: []
        },
        {
            id: 'item-1.2',
            number: '1.2',
            title: 'Лицензии и разрешительная документация',
            level: 1,
            has_children: false,
            files_count: Math.floor(Math.random() * 5),
            files: [],
            status: { tso: 'completed', eto: 'completed', omsu: 'pending', commission: 'pending' },
            score: Math.random() > 0.5 ? Math.floor(Math.random() * 10) + 1 : null,
            comments_count: Math.floor(Math.random() * 2),
            comments: []
        },
        {
            id: 'item-1.3',
            number: '1.3',
            title: 'Свидетельство о регистрации',
            level: 1,
            has_children: false,
            files_count: Math.floor(Math.random() * 2),
            files: [],
            status: { tso: 'completed', eto: 'active', omsu: 'pending', commission: 'pending' },
            score: Math.random() > 0.5 ? Math.floor(Math.random() * 10) + 1 : null,
            comments_count: 0,
            comments: []
        },
        {
            id: 'item-2',
            number: '2',
            title: 'Техническая документация',
            level: 0,
            has_children: true,
            files_count: 0,
            files: [],
            status: { tso: 'pending', eto: 'pending', omsu: 'pending', commission: 'pending' },
            score: null,
            comments_count: 0,
            comments: []
        },
        {
            id: 'item-2.1',
            number: '2.1',
            title: 'Технический паспорт объекта',
            level: 1,
            has_children: false,
            files_count: Math.floor(Math.random() * 4),
            files: [],
            status: { tso: 'completed', eto: 'completed', omsu: 'completed', commission: 'active' },
            score: Math.random() > 0.3 ? Math.floor(Math.random() * 10) + 1 : null,
            comments_count: Math.floor(Math.random() * 5),
            comments: []
        },
        {
            id: 'item-2.2',
            number: '2.2',
            title: 'Схемы теплоснабжения',
            level: 1,
            has_children: false,
            files_count: Math.floor(Math.random() * 3),
            files: [],
            status: { tso: 'completed', eto: 'rejected', omsu: 'pending', commission: 'pending' },
            score: null,
            comments_count: Math.floor(Math.random() * 4),
            comments: []
        },
        {
            id: 'item-2.3',
            number: '2.3',
            title: 'Акты гидравлических испытаний',
            level: 1,
            has_children: false,
            files_count: Math.floor(Math.random() * 2),
            files: [],
            status: { tso: 'active', eto: 'pending', omsu: 'pending', commission: 'pending' },
            score: null,
            comments_count: 0,
            comments: []
        },
        {
            id: 'item-3',
            number: '3',
            title: 'Договоры и соглашения',
            level: 0,
            has_children: true,
            files_count: 0,
            files: [],
            status: { tso: 'pending', eto: 'pending', omsu: 'pending', commission: 'pending' },
            score: null,
            comments_count: 0,
            comments: []
        },
        {
            id: 'item-3.1',
            number: '3.1',
            title: 'Договоры с поставщиками энергоресурсов',
            level: 1,
            has_children: false,
            files_count: Math.floor(Math.random() * 6),
            files: [],
            status: { tso: 'completed', eto: 'completed', omsu: 'completed', commission: 'completed' },
            score: Math.random() > 0.2 ? Math.floor(Math.random() * 10) + 1 : null,
            comments_count: Math.floor(Math.random() * 2),
            comments: []
        },
        {
            id: 'item-3.2',
            number: '3.2',
            title: 'Договоры с потребителями',
            level: 1,
            has_children: false,
            files_count: Math.floor(Math.random() * 10),
            files: [],
            status: { tso: 'completed', eto: 'completed', omsu: 'active', commission: 'pending' },
            score: Math.random() > 0.3 ? Math.floor(Math.random() * 10) + 1 : null,
            comments_count: Math.floor(Math.random() * 3),
            comments: []
        },
        {
            id: 'item-4',
            number: '4',
            title: 'Отчетность',
            level: 0,
            has_children: true,
            files_count: 0,
            files: [],
            status: { tso: 'pending', eto: 'pending', omsu: 'pending', commission: 'pending' },
            score: null,
            comments_count: 0,
            comments: []
        },
        {
            id: 'item-4.1',
            number: '4.1',
            title: 'Годовая отчетность',
            level: 1,
            has_children: false,
            files_count: Math.floor(Math.random() * 5),
            files: [],
            status: { tso: 'completed', eto: 'completed', omsu: 'completed', commission: 'completed' },
            score: Math.random() > 0.2 ? Math.floor(Math.random() * 10) + 1 : null,
            comments_count: Math.floor(Math.random() * 2),
            comments: []
        },
        {
            id: 'item-4.2',
            number: '4.2',
            title: 'Квартальная отчетность',
            level: 1,
            has_children: false,
            files_count: Math.floor(Math.random() * 8),
            files: [],
            status: { tso: 'completed', eto: 'active', omsu: 'pending', commission: 'pending' },
            score: Math.random() > 0.4 ? Math.floor(Math.random() * 10) + 1 : null,
            comments_count: Math.floor(Math.random() * 4),
            comments: []
        }
    ];
}

// ===== REGISTRY FILE SELECTOR =====
function openRegistryFileSelector() {
    // Создать модальное окно для выбора файлов из реестра
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.id = 'registryFileSelectorModal';
    modal.innerHTML = `
        <div class="modal" style="max-width: 800px;">
            <div class="modal-header">
                <h3>Выбрать документы из реестра</h3>
                <button class="modal-close" onclick="closeRegistryFileSelector()">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                ${renderRegistryFilesList()}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeRegistryFileSelector()">Отмена</button>
                <button class="btn btn-primary" onclick="addSelectedRegistryFiles()">Добавить выбранные</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function closeRegistryFileSelector() {
    const modal = document.getElementById('registryFileSelectorModal');
    if (modal) {
        modal.remove();
    }
}

function renderRegistryFilesList() {
    // Получить данные реестра из registry.js (если они есть)
    // Для визуала создадим несколько тестовых документов из реестра

    const registryDocs = [
        {
            id: 'reg-doc-1',
            number: '1',
            title: 'Устав организации',
            packs: [
                {
                    version: 2,
                    files: [
                        { name: 'Устав_новая_редакция.pdf', size: 2589456 },
                        { name: 'Приложение_1.docx', size: 456123 },
                        { name: 'Изменения.pdf', size: 234567 }
                    ]
                }
            ]
        },
        {
            id: 'reg-doc-2',
            number: '2.1',
            title: 'Лицензия на осуществление деятельности',
            packs: [
                {
                    version: 1,
                    files: [
                        { name: 'Лицензия.pdf', size: 1234567 }
                    ]
                }
            ]
        }
    ];

    let html = '<div style="margin-bottom: 16px; color: var(--gray-600); font-size: 14px;">Выберите файлы из последних версий паков реестра:</div>';

    registryDocs.forEach(doc => {
        if (doc.packs && doc.packs.length > 0) {
            const latestPack = doc.packs[doc.packs.length - 1];

            html += `
                <div style="margin-bottom: 20px; padding: 16px; border: 1px solid var(--gray-200); border-radius: 8px; background: var(--gray-50);">
                    <div style="font-weight: 600; margin-bottom: 12px; color: var(--gray-900);">
                        ${doc.number}. ${doc.title}
                        <span style="color: var(--gray-500); font-weight: 400; font-size: 13px;"> — Пак v${latestPack.version} (актуальный)</span>
                    </div>
                    <div class="files-list" style="display: flex; flex-direction: column; gap: 8px;">
            `;

            latestPack.files.forEach((file, fileIndex) => {
                const fileId = `${doc.id}-${fileIndex}`;
                html += `
                    <label style="display: flex; align-items: center; gap: 12px; padding: 8px; background: white; border: 1px solid var(--gray-200); border-radius: 6px; cursor: pointer; transition: all 0.2s;"
                           onmouseover="this.style.background='var(--primary-light)'; this.style.borderColor='var(--primary)';"
                           onmouseout="this.style.background='white'; this.style.borderColor='var(--gray-200)';">
                        <input type="checkbox"
                               class="registry-file-checkbox"
                               data-filename="${file.name}"
                               data-filesize="${file.size}"
                               style="width: 18px; height: 18px; cursor: pointer;">
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: var(--gray-900); font-size: 14px;">${file.name}</div>
                            <div style="font-size: 12px; color: var(--gray-500);">${formatFileSize(file.size)}</div>
                        </div>
                        <div style="color: var(--gray-400);">📄</div>
                    </label>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }
    });

    return html;
}

function addSelectedRegistryFiles() {
    // Получить все выбранные чекбоксы
    const checkboxes = document.querySelectorAll('.registry-file-checkbox:checked');

    if (checkboxes.length === 0) {
        alert('Выберите хотя бы один файл');
        return;
    }

    // Создать псевдо-файлы из выбранных документов
    checkboxes.forEach(checkbox => {
        const fileName = checkbox.dataset.filename;
        const fileSize = parseInt(checkbox.dataset.filesize);

        // Создать объект, имитирующий File
        const pseudoFile = {
            name: fileName,
            size: fileSize,
            type: 'application/pdf',
            lastModified: Date.now()
        };

        // Добавить в список выбранных файлов
        selectedFiles.push(pseudoFile);
    });

    // Закрыть модальное окно выбора из реестра
    closeRegistryFileSelector();

    // Обновить предпросмотр файлов
    renderFilesPreview();
    updateUploadButton();
}