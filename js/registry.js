// ===== REGISTRY DETAIL =====

let currentRegistryData = null;
let currentRegistryOrgType = null;
let currentRegistryOrgId = null;
let currentRegistryOrgName = null;

function showRegistryDetail(orgType, orgId, orgName) {
    currentView = 'registry';
    currentRegistryOrgType = orgType;
    currentRegistryOrgId = orgId;
    currentRegistryOrgName = orgName;

    // Получить или создать данные реестра для организации
    currentRegistryData = getOrCreateRegistryData(orgType, orgId);

    // Скрыть дашборд
    document.getElementById('dashboardView').classList.remove('active');

    // Показать вид реестра
    const registryView = document.getElementById('registryView');
    registryView.classList.add('active');

    // Обновить header
    updateRegistryHeader();

    // Отрисовать метаданные
    renderRegistryMeta();

    // Отрисовать таблицу документов
    renderRegistryTable();

    window.scrollTo(0, 0);
}

function getOrCreateRegistryData(orgType, orgId) {
    // В реальном приложении здесь будет запрос к API
    // Пока создаем тестовые данные
    return {
        id: `registry-${orgType}-${orgId}`,
        org_type: orgType,
        org_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: getRegistryItemsTemplate(orgType)
    };
}

function getRegistryItemsTemplate(orgType) {
    // Возвращаем шаблон документов в зависимости от типа организации
    const baseItems = [
        {
            id: 'doc-1',
            number: '1',
            title: 'Устав организации',
            level: 0,
            has_children: false,
            packs: [
                {
                    version: 1,
                    created_at: new Date('2024-01-15').toISOString(),
                    files: [
                        {name: 'Устав.pdf', size: 2456789, uploaded_at: new Date('2024-01-15').toISOString()},
                        {name: 'Приложение_1.docx', size: 456123, uploaded_at: new Date('2024-01-15').toISOString()}
                    ]
                },
                {
                    version: 2,
                    created_at: new Date('2024-06-20').toISOString(),
                    files: [
                        {name: 'Устав_новая_редакция.pdf', size: 2589456, uploaded_at: new Date('2024-06-20').toISOString()},
                        {name: 'Приложение_1.docx', size: 456123, uploaded_at: new Date('2024-06-20').toISOString()},
                        {name: 'Изменения.pdf', size: 234567, uploaded_at: new Date('2024-06-20').toISOString()}
                    ]
                }
            ]
        },
        {
            id: 'doc-2',
            number: '2',
            title: 'Лицензии и разрешительная документация',
            level: 0,
            has_children: true,
            packs: []
        },
        {
            id: 'doc-2.1',
            number: '2.1',
            title: 'Лицензия на осуществление деятельности',
            level: 1,
            has_children: false,
            packs: [
                {
                    version: 1,
                    created_at: new Date('2024-03-10').toISOString(),
                    files: [
                        {name: 'Лицензия.pdf', size: 1234567, uploaded_at: new Date('2024-03-10').toISOString()}
                    ]
                }
            ]
        },
        {
            id: 'doc-2.2',
            number: '2.2',
            title: 'Разрешение на эксплуатацию объектов',
            level: 1,
            has_children: false,
            packs: []
        },
        {
            id: 'doc-3',
            number: '3',
            title: 'Договоры и соглашения',
            level: 0,
            has_children: true,
            packs: []
        },
        {
            id: 'doc-3.1',
            number: '3.1',
            title: 'Договоры с поставщиками',
            level: 1,
            has_children: false,
            packs: []
        },
        {
            id: 'doc-3.2',
            number: '3.2',
            title: 'Договоры с потребителями',
            level: 1,
            has_children: false,
            packs: []
        },
        {
            id: 'doc-4',
            number: '4',
            title: 'Технические документы',
            level: 0,
            has_children: true,
            packs: []
        },
        {
            id: 'doc-4.1',
            number: '4.1',
            title: 'Технические паспорта объектов',
            level: 1,
            has_children: false,
            packs: []
        },
        {
            id: 'doc-4.2',
            number: '4.2',
            title: 'Схемы теплоснабжения',
            level: 1,
            has_children: false,
            packs: []
        },
        {
            id: 'doc-5',
            number: '5',
            title: 'Отчетность',
            level: 0,
            has_children: true,
            packs: []
        },
        {
            id: 'doc-5.1',
            number: '5.1',
            title: 'Годовая отчетность',
            level: 1,
            has_children: false,
            packs: []
        },
        {
            id: 'doc-5.2',
            number: '5.2',
            title: 'Квартальная отчетность',
            level: 1,
            has_children: false,
            packs: []
        }
    ];

    return baseItems;
}

function updateRegistryHeader() {
    const title = document.querySelector('#registryView .main-header h1');
    const breadcrumbLink = document.querySelector('#registryView .detail-breadcrumb a');
    const breadcrumbText = document.querySelector('#registryView .detail-breadcrumb span:last-child');

    const typeNames = {
        'omsu': 'ОМСУ',
        'eto': 'ЕТО',
        'tso': 'ТСО',
        'uk': 'УК',
        'boiler': 'Котельная'
    };

    title.textContent = `Реестр документов: ${currentRegistryOrgName} (${typeNames[currentRegistryOrgType]})`;

    // Breadcrumb
    breadcrumbLink.textContent = `← Вернуться к дашборду`;
    breadcrumbLink.onclick = () => {
        showDashboard(currentRegistryOrgType, currentRegistryOrgId, currentRegistryOrgName);
        return false;
    };
    breadcrumbText.textContent = `Реестр документов`;
}

function renderRegistryMeta() {
    // Подсчитать общее количество документов и загруженных паков
    const totalDocs = currentRegistryData.items.length;
    const docsWithPacks = currentRegistryData.items.filter(item => item.packs && item.packs.length > 0).length;
    const totalPacks = currentRegistryData.items.reduce((sum, item) => sum + (item.packs ? item.packs.length : 0), 0);

    document.querySelector('#registryView [data-meta="registry-id"] .detail-meta-value').textContent = currentRegistryData.id;
    document.querySelector('#registryView [data-meta="created"] .detail-meta-value').textContent = new Date(currentRegistryData.created_at).toLocaleDateString('ru-RU');
    document.querySelector('#registryView [data-meta="docs"] .detail-meta-value').textContent = `${docsWithPacks} из ${totalDocs}`;
    document.querySelector('#registryView [data-meta="files"] .detail-meta-value').textContent = `${totalPacks} паков`;

    // Progress bar
    const progress = totalDocs > 0 ? Math.round((docsWithPacks / totalDocs) * 100) : 0;
    document.querySelector('#registryView .progress-label-value').textContent = progress + '%';
    document.querySelector('#registryView .progress-fill').style.width = progress + '%';
}

function renderRegistryTable() {
    const tbody = document.querySelector('#registryView .tree-table tbody');

    if (!tbody) {
        console.error('Registry tbody not found!');
        return;
    }

    if (!currentRegistryData.items) {
        console.error('No items in currentRegistryData!');
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Документы не найдены</td></tr>';
        return;
    }

    let html = '';

    currentRegistryData.items.forEach(item => {
        html += renderRegistryTreeRow(item);
    });

    tbody.innerHTML = html;
}

function renderRegistryTreeRow(item) {
    const indent = item.level * 20;
    const toggleClass = item.has_children ? 'tree-row-toggle' : 'tree-row-toggle empty';
    const rowClass = item.has_children ? 'tree-row has-children' : 'tree-row';

    const hasPacks = item.packs && item.packs.length > 0;
    const packIcon = hasPacks ? 'has-content' : '';

    // Получить информацию о последнем паке (актуальном)
    let packInfo = '';
    let buttonText = '';
    if (hasPacks) {
        const latestPack = item.packs[item.packs.length - 1];
        const filesCount = latestPack.files ? latestPack.files.length : 0;
        packInfo = `📎 v${item.packs.length} (${filesCount} файл${filesCount === 1 ? '' : filesCount < 5 ? 'а' : 'ов'})`;
        buttonText = 'Добавить новый пак';
    } else {
        packInfo = 'Нет паков';
        buttonText = 'Создать первый пак';
    }

    return `
        <tr class="${rowClass}" data-item="${item.number}" data-level="${item.level}">
            <td>
                <div class="tree-cell-content" style="padding-left: ${indent}px">
                    <span class="${toggleClass}" onclick="toggleRegistryTreeRow(this)">▶</span>
                    <span class="tree-row-number">${item.number}</span>
                </div>
            </td>
            <td>
                <div class="tree-row-title">${item.title}</div>
            </td>
            <td>
                <div class="files-cell">
                    <div class="drop-zone ${!hasPacks ? 'empty-drop-zone' : ''}"
                         data-item-id="${item.id}"
                         data-item-number="${item.number}"
                         ondragover="handleRegistryDragOver(event)"
                         ondragleave="handleRegistryDragLeave(event)"
                         ondrop="handleRegistryFileDrop(event)"
                         onclick="handleRegistryDropZoneClick(event, '${item.id}', '${item.number}', ${hasPacks})">
                        <span class="icon-badge ${packIcon}" ${!hasPacks ? 'style="opacity: 0.6;"' : ''}>
                            ${packInfo}
                        </span>
                        <button class="btn-upload-image" onclick="event.stopPropagation(); uploadRegistryFile('${item.id}', '${item.number}')" title="${buttonText}">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </td>
            <td>
                <button class="action-btn" onclick="openRegistryCommentsModal('${item.id}', '${item.number}')">
                    💬 Примечания
                </button>
            </td>
        </tr>
    `;
}

function toggleRegistryTreeRow(toggle) {
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

// ===== DRAG & DROP для реестра =====
function handleRegistryDropZoneClick(event, itemId, itemNumber, filesCount) {
    event.stopPropagation();

    // Если есть файлы, открыть модальное окно просмотра
    if (filesCount > 0) {
        openRegistryFilesModal(itemId);
    } else {
        // Если файлов нет, открыть модальное окно загрузки
        openRegistryUploadModal(itemId, itemNumber);
    }
}

function handleRegistryDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = event.currentTarget;
    dropZone.classList.add('drag-over');
}

function handleRegistryDragLeave(event) {
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

function handleRegistryFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const dropZone = event.currentTarget;
    dropZone.classList.remove('drag-over');

    const itemId = dropZone.dataset.itemId;
    const itemNumber = dropZone.dataset.itemNumber;
    const files = event.dataTransfer.files;

    if (files.length === 0) return;

    openRegistryUploadModal(itemId, itemNumber, files);
}

// ===== UPLOAD для реестра =====
let currentRegistryUploadItemId = null;
let currentRegistryUploadItemNumber = null;
let selectedRegistryFiles = [];

function uploadRegistryFile(itemId, itemNumber) {
    openRegistryUploadModal(itemId, itemNumber);
}

function openRegistryUploadModal(itemId, itemNumber, files = null) {
    currentRegistryUploadItemId = itemId;
    currentRegistryUploadItemNumber = itemNumber;
    selectedRegistryFiles = [];

    const modal = document.getElementById('registryUploadModal');
    const modalTitle = modal.querySelector('.modal-header h3');
    modalTitle.textContent = `Загрузка документов к пункту ${itemNumber}`;

    // Очистить предпросмотр
    document.getElementById('registryFilesPreview').innerHTML = '';
    document.getElementById('registryUploadButton').disabled = true;

    // Если файлы переданы, добавить их
    if (files && files.length > 0) {
        addRegistryFilesToPreview(files);
    }

    modal.classList.add('active');
    setupRegistryUploadAreaHandlers();
}

function closeRegistryUploadModal() {
    const modal = document.getElementById('registryUploadModal');
    modal.classList.remove('active');
    selectedRegistryFiles = [];
    currentRegistryUploadItemId = null;
    currentRegistryUploadItemNumber = null;

    // Сбросить прогресс
    document.getElementById('registryUploadProgress').classList.remove('active');
    document.getElementById('registryUploadProgressFill').style.width = '0%';
}

function setupRegistryUploadAreaHandlers() {
    const uploadArea = document.getElementById('registryUploadArea');
    const fileInput = document.getElementById('registryFileInput');

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
            addRegistryFilesToPreview(files);
        }
    });

    // Обработчик для input file
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            addRegistryFilesToPreview(files);
        }
        // Сбросить input для повторного выбора тех же файлов
        e.target.value = '';
    });
}

function addRegistryFilesToPreview(files) {
    const filesArray = Array.from(files);

    filesArray.forEach(file => {
        // Проверить, не добавлен ли файл уже
        const exists = selectedRegistryFiles.some(f => f.name === file.name && f.size === file.size);
        if (!exists) {
            selectedRegistryFiles.push(file);
        }
    });

    renderRegistryFilesPreview();
    updateRegistryUploadButton();
}

function renderRegistryFilesPreview() {
    const preview = document.getElementById('registryFilesPreview');

    if (selectedRegistryFiles.length === 0) {
        preview.innerHTML = '';
        return;
    }

    let html = '';
    selectedRegistryFiles.forEach((file, index) => {
        const fileType = getFileTypeClass(file.name);
        const fileIcon = getFileIcon(file.name);

        html += `
            <div class="file-preview-item">
                <div class="file-preview-icon ${fileType}">${fileIcon}</div>
                <div class="file-preview-info">
                    <div class="file-preview-name">${file.name}</div>
                    <div class="file-preview-size">${formatFileSize(file.size)}</div>
                </div>
                <button class="file-preview-remove" onclick="removeRegistryFileFromPreview(${index})" title="Удалить">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `;
    });

    preview.innerHTML = html;
}

function removeRegistryFileFromPreview(index) {
    selectedRegistryFiles.splice(index, 1);
    renderRegistryFilesPreview();
    updateRegistryUploadButton();
}

function updateRegistryUploadButton() {
    const button = document.getElementById('registryUploadButton');
    button.disabled = selectedRegistryFiles.length === 0;
    button.textContent = selectedRegistryFiles.length > 0
        ? `Загрузить файлы (${selectedRegistryFiles.length})`
        : 'Загрузить файлы';
}

function confirmRegistryUpload() {
    if (selectedRegistryFiles.length === 0) return;

    const progressContainer = document.getElementById('registryUploadProgress');
    const progressFill = document.getElementById('registryUploadProgressFill');
    const progressText = document.getElementById('registryUploadProgressText');
    const uploadButton = document.getElementById('registryUploadButton');

    // Показать прогресс
    progressContainer.classList.add('active');
    uploadButton.disabled = true;

    // Симуляция загрузки (в реальном приложении здесь будет AJAX запрос)
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressFill.style.width = progress + '%';
        progressText.textContent = `Загрузка пака... ${progress}%`;

        if (progress >= 100) {
            clearInterval(interval);

            // Имитация успешной загрузки
            setTimeout(() => {
                // Создать новый пак документов
                createNewPackForItem(currentRegistryUploadItemId, selectedRegistryFiles);

                const item = findRegistryItemById(currentRegistryUploadItemId);
                const packVersion = item.packs ? item.packs.length : 1;

                // Показать уведомление
                progressText.textContent = `✓ Пак v${packVersion} создан (${selectedRegistryFiles.length} файлов)`;

                // Закрыть модальное окно через 1 секунду
                setTimeout(() => {
                    closeRegistryUploadModal();
                }, 1000);
            }, 500);
        }
    }, 200);
}

function createNewPackForItem(itemId, files) {
    // Найти пункт и создать новый пак
    const item = findRegistryItemById(itemId);
    if (item) {
        if (!item.packs) {
            item.packs = [];
        }

        // Создать новый пак с файлами
        const newPack = {
            version: item.packs.length + 1,
            created_at: new Date().toISOString(),
            files: files.map(file => ({
                name: file.name,
                size: file.size,
                uploaded_at: new Date().toISOString()
            }))
        };

        item.packs.push(newPack);

        // Обновить UI
        renderRegistryTable();
        renderRegistryMeta();
    }
}

function findRegistryItemById(itemId) {
    if (!currentRegistryData || !currentRegistryData.items) return null;
    return currentRegistryData.items.find(item => item.id === itemId);
}

// ===== MODALS =====
function openRegistryFilesModal(itemId) {
    const item = findRegistryItemById(itemId);
    if (!item) return;

    const modal = document.getElementById('registryFilesModal');
    const modalTitle = modal.querySelector('.modal-header h3');
    const modalBody = modal.querySelector('.modal-body');
    const modalFooter = modal.querySelector('.modal-footer');

    modalTitle.textContent = `Документы к пункту ${item.number}`;

    let html = '';

    if (item.packs && item.packs.length > 0) {
        html += '<div class="packs-list">';

        // Отрисовать паки в обратном порядке (последний пак первым)
        for (let i = item.packs.length - 1; i >= 0; i--) {
            const pack = item.packs[i];
            const version = i + 1;
            const isLatest = i === item.packs.length - 1;
            const expandedClass = isLatest ? 'expanded' : '';

            html += `
                <div class="pack-item ${expandedClass}" data-pack-version="${version}">
                    <div class="pack-header" onclick="togglePackItem(this)">
                        <div class="pack-info">
                            <span class="pack-version">${isLatest ? '✓ ' : ''}Пак v${version}${isLatest ? ' (актуальный)' : ''}</span>
                            <span class="pack-date">${new Date(pack.created_at).toLocaleDateString('ru-RU')}</span>
                        </div>
                        <div class="pack-actions">
                            <span class="pack-files-count">${pack.files.length} файлов</span>
                            <span class="pack-toggle">▼</span>
                        </div>
                    </div>
                    <div class="pack-content">
                        <div class="files-list">
            `;

            pack.files.forEach(file => {
                const fileType = getFileType(file.name);
                html += `
                    <div class="file-item">
                        <div class="file-icon">${fileType}</div>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-meta">${formatFileSize(file.size)}</div>
                        </div>
                    </div>
                `;
            });

            html += `
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="downloadPack('${itemId}', ${i})" style="margin-top: 12px;">
                            📦 Скачать пак
                        </button>
                    </div>
                </div>
            `;
        }

        html += '</div>';
    } else {
        html += '<div class="empty-state">Паков пока нет</div>';
    }

    modalBody.innerHTML = html;

    // Добавить кнопку добавления нового пака в footer
    const addButtonText = item.packs && item.packs.length > 0 ? 'Добавить новый пак' : 'Создать пак';
    modalFooter.innerHTML = `
        <button class="btn btn-primary" onclick="closeRegistryModal('registryFilesModal'); openRegistryUploadModal('${itemId}', '${item.number}')">
            ${addButtonText}
        </button>
        <button class="btn btn-secondary" onclick="closeRegistryModal('registryFilesModal')">Закрыть</button>
    `;

    modal.classList.add('active');
}

function togglePackItem(header) {
    const packItem = header.closest('.pack-item');
    packItem.classList.toggle('expanded');
}

function downloadPack(itemId, packIndex) {
    console.log('Скачивание пака:', itemId, packIndex);
    // TODO: Реализовать скачивание пака
    alert('Функция скачивания пака будет реализована');
}

function openRegistryCommentsModal(itemId, itemNumber) {
    const item = findRegistryItemById(itemId);
    if (!item) return;

    const modal = document.getElementById('registryCommentsModal');
    const modalTitle = modal.querySelector('.modal-header h3');
    const modalBody = modal.querySelector('.modal-body');

    modalTitle.textContent = `Примечания к пункту ${itemNumber}`;

    let html = '<div class="empty-state">Примечаний пока нет</div>';

    modalBody.innerHTML = html;
    modal.classList.add('active');
}

function closeRegistryModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
