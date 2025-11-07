// ===== SHEET DETAIL =====

let currentSheetData = null;
let currentScrollToItem = null;

function showSheetDetail(sheetId, itemNumber = null) {
    currentView = 'detail';
    currentScrollToItem = itemNumber;

    // Найти sheet в данных
    currentSheetData = sheetsData.find(s => s.id === sheetId);

    if (!currentSheetData) {
        console.error('Sheet not found:', sheetId);
        return;
    }

    // Скрыть дашборд
    document.getElementById('dashboardView').classList.remove('active');

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
    document.querySelector('[data-meta="sheet-id"] .detail-meta-value').textContent = `ОЛ-${currentSheetData.id}`;
    document.querySelector('[data-meta="created"] .detail-meta-value').textContent = new Date(currentSheetData.created_at).toLocaleDateString('ru-RU');
    document.querySelector('[data-meta="index"] .detail-meta-value').textContent = currentSheetData.index;
    document.querySelector('[data-meta="docs"] .detail-meta-value').textContent = `${currentSheetData.docs_approved} из ${currentSheetData.docs_total}`;

    // Progress bar
    document.querySelector('.progress-label-value').textContent = currentSheetData.progress + '%';
    document.querySelector('.progress-fill').style.width = currentSheetData.progress + '%';
}

function renderItemsTable() {
    const tbody = document.querySelector('.tree-table tbody');

    console.log('renderItemsTable called');
    console.log('tbody exists:', !!tbody);
    console.log('currentSheetData:', currentSheetData);
    console.log('currentSheetData.items:', currentSheetData?.items);

    if (!tbody) {
        console.error('tbody not found!');
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
    console.log('Rendered', currentSheetData.items.length, 'items');

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