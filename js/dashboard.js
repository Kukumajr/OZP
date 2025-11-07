// ===== DASHBOARD =====

function showDashboard(type, id, name) {
    currentView = 'dashboard';
    currentOrgType = type;
    currentOrgId = id;

    // Скрыть детальный вид
    document.getElementById('detailView').classList.remove('active');

    // Показать дашборд
    const dashboard = document.getElementById('dashboardView');
    dashboard.classList.add('active');

    // Обновить заголовок
    updateDashboardHeader(type, name);

    // Загрузить данные
    loadDashboardData(type, id);

    window.scrollTo(0, 0);
}

function updateDashboardHeader(type, name) {
    const header = document.querySelector('#dashboardView .main-header h1');
    const subtitle = document.querySelector('#dashboardView .main-header p');

    const typeNames = {
        'omsu': 'ОМСУ',
        'eto': 'ЕТО',
        'tso': 'ТСО'
    };

    header.textContent = `${name} (${typeNames[type]}) - Дашборд готовности к ОЗП`;
    subtitle.textContent = `Период: ${currentPeriod}`;
}

function loadDashboardData(type, id) {
    // Получить все листы для данной организации (только объекты)
    const sheets = getSheetsForOrganization(type, id);

    // Получить лист самой организации
    const orgSheet = getOrganizationSheet(type, id);

    // Отрисовать карточку листа организации (если есть)
    renderOrganizationSheet(orgSheet, type);

    // Удалить старый блок дочерних организаций (важно для переключения между организациями)
    const oldChildOrgsBlock = document.querySelector('.child-organizations');
    if (oldChildOrgsBlock) oldChildOrgsBlock.remove();

    // Отрисовать блок дочерних организаций (только для ОМСУ и ЕТО)
    if (type === 'omsu' || type === 'eto') {
        const childOrgSheets = getChildOrganizationsSheets(type, id);
        if (childOrgSheets.length > 0) {
            renderChildOrganizations(childOrgSheets, type);
        }
    }

    // Рассчитать KPI
    const kpi = calculateKPI(sheets);

    // Отрисовать KPI
    renderKPI(kpi);

    // Отрисовать таблицу объектов
    renderObjectsTable(sheets);

    // Отрисовать замечания и историю (если есть лист организации)
    if (orgSheet) {
        renderRemarks(orgSheet);
        renderActivityHistory(orgSheet);
    }
}

function getSheetsForOrganization(type, id) {
    if (!sheetsData) return [];

    return sheetsData.filter(sheet => {
        if (sheet.period !== currentPeriod) return false;
        if (sheet.entity_type !== 'object') return false; // Только объекты

        switch (type) {
            case 'omsu':
                return sheet.omsu_id === id;
            case 'eto':
                return sheet.eto_id === id;
            case 'tso':
                return sheet.tso_id === id;
            default:
                return false;
        }
    });
}

function getOrganizationSheet(type, id) {
    if (!sheetsData) return null;

    return sheetsData.find(sheet => {
        return sheet.period === currentPeriod &&
               sheet.entity_type === type &&
               sheet.entity_id === id;
    });
}

function getChildOrganizationsSheets(type, id) {
    if (!organizationsData) return [];

    const childSheets = [];

    if (type === 'omsu') {
        // Для ОМСУ получаем все ЕТО и ТСО
        const omsu = findOrganization('omsu', id);
        if (omsu && omsu.eto_list) {
            omsu.eto_list.forEach(eto => {
                // Добавить лист ЕТО (или пустой объект если листа нет)
                const etoSheet = getOrganizationSheet('eto', eto.id);
                childSheets.push({
                    ...(etoSheet || {}),
                    org_name: eto.name,
                    org_type: 'eto',
                    org_type_name: 'ЕТО',
                    entity_id: eto.id,
                    has_sheet: !!etoSheet
                });

                // Добавить все листы ТСО внутри ЕТО
                if (eto.tso_list) {
                    eto.tso_list.forEach(tso => {
                        const tsoSheet = getOrganizationSheet('tso', tso.id);
                        childSheets.push({
                            ...(tsoSheet || {}),
                            org_name: tso.name,
                            org_type: 'tso',
                            org_type_name: 'ТСО',
                            parent_name: eto.name,
                            entity_id: tso.id,
                            has_sheet: !!tsoSheet
                        });
                    });
                }
            });
        }
    } else if (type === 'eto') {
        // Для ЕТО получаем все ТСО
        const eto = findOrganization('eto', id);
        if (eto && eto.tso_list) {
            eto.tso_list.forEach(tso => {
                const tsoSheet = getOrganizationSheet('tso', tso.id);
                childSheets.push({
                    ...(tsoSheet || {}),
                    org_name: tso.name,
                    org_type: 'tso',
                    org_type_name: 'ТСО',
                    entity_id: tso.id,
                    has_sheet: !!tsoSheet
                });
            });
        }
    }

    return childSheets;
}

function findOrganization(type, id) {
    if (!organizationsData) return null;

    if (type === 'omsu') {
        return organizationsData.omsu_list.find(o => o.id === id);
    } else if (type === 'eto') {
        for (const omsu of organizationsData.omsu_list) {
            const eto = omsu.eto_list.find(e => e.id === id);
            if (eto) return eto;
        }
    } else if (type === 'tso') {
        for (const omsu of organizationsData.omsu_list) {
            for (const eto of omsu.eto_list) {
                const tso = eto.tso_list.find(t => t.id === id);
                if (tso) return tso;
            }
        }
    }

    return null;
}

function renderOrganizationSheet(sheet, type) {
    const wrapper = document.querySelector('#dashboardView .content-wrapper');
    if (!wrapper) return;

    // Удалить старую секцию если есть
    const oldSection = document.querySelector('.organization-sheet-section');
    if (oldSection) oldSection.remove();

    const typeNames = {
        'omsu': 'ОМСУ',
        'eto': 'ЕТО',
        'tso': 'ТСО'
    };

    let cardHtml = '';

    if (!sheet) {
        // Если листа нет, показываем пустую карточку с предложением создать
        cardHtml = `
            <div class="organization-sheet-section">
                <div class="organization-sheet-card" style="background: var(--gray-50); border: 2px dashed var(--gray-300);">
                    <div class="org-sheet-title">
                        <h3>Оценочный лист ${typeNames[type]}</h3>
                        <span class="org-sheet-number" style="color: var(--gray-400);">Не создан</span>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; padding: 30px;">
                        <svg width="64" height="64" fill="none" stroke="var(--gray-400)" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <div style="text-align: center;">
                            <div style="font-size: 16px; font-weight: 600; color: var(--gray-700); margin-bottom: 8px;">
                                Оценочный лист не создан
                            </div>
                            <div style="font-size: 14px; color: var(--gray-500);">
                                Создайте оценочный лист для отслеживания готовности организации к ОЗП
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="createOrganizationSheet('${type}', '${currentOrgId}', '${currentOrgType}')">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Создать оценочный лист
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        // Если лист есть, показываем его с данными
        const progressClass = sheet.progress >= 90 ? 'high' :
            sheet.progress >= 70 ? 'medium' : 'low';
        const indexColor = sheet.index >= 0.95 ? 'var(--success)' :
            sheet.index >= 0.85 ? 'var(--warning)' : 'var(--danger)';
        const statusClass = sheet.overall_status;
        const statusText = getStatusText(sheet.overall_status);

        const hasAct = sheet.act_created === true;
        const passportBtnDisabled = !hasAct;

        cardHtml = `
            <div class="organization-sheet-section">
                <div class="organization-sheet-card">
                    <div class="org-sheet-title">
                        <h3>Оценочный лист ${typeNames[type]}</h3>
                        <span class="org-sheet-number">${sheet.sheet_number}</span>
                    </div>
                    <div style="display: flex;gap: 5px;">
                    <div class="org-sheet-stats">
                        <div class="org-sheet-stat-compact">
                            <span class="org-stat-label">Прогресс</span>
                            <span class="org-stat-value">${sheet.progress}%</span>
                        </div>
                        <div class="org-sheet-stat-compact">
                            <span class="org-stat-label">Индекс</span>
                            <span class="org-stat-value" style="color: ${indexColor}">${sheet.index}</span>
                        </div>
                        <div class="org-sheet-stat-compact">
                            <span class="org-stat-label">Документы</span>
                            <span class="org-stat-value">${sheet.docs_approved}/${sheet.docs_total}</span>
                        </div>
                        <div class="org-sheet-stat-compact">
                            <span class="org-stat-label">Статус</span>
                            <span class="status-indicator ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sheet-open" style="height: 100%" onclick="showSheetDetail('${sheet.id}')">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        Открыть оценочный лист
                    </button>
                    </div>
                </div>

                <div class="organization-actions-card">
                    <h3 style="text-align: center;">Документы организации</h3>
                    <div class="org-actions-buttons" style="display: flex;flex-direction: row;">
                        <button class="btn btn-secondary" onclick="createAct('${sheet.id}')" style="width: 50%">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            ${hasAct ? 'Акт создан ✓' : 'Создать акт'}
                        </button>
                        <button style="width: 50%" class="btn btn-secondary" onclick="createPassport('${sheet.id}')" ${passportBtnDisabled ? 'disabled' : ''}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            Создать паспорт
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Вставить карточку перед KPI
    const kpiSection = wrapper.querySelector('.dashboard-kpi');
    if (kpiSection) {
        kpiSection.insertAdjacentHTML('beforebegin', cardHtml);
    } else {
        wrapper.insertAdjacentHTML('afterbegin', cardHtml);
    }
}

function calculateKPI(sheets) {
    const kpi = {
        total: sheets.length,
        avgProgress: 0,
        progressChange: 0,
        issuesCount: 0,
        avgIndex: 0
    };

    if (sheets.length === 0) return kpi;

    let totalProgress = 0;
    let totalIndex = 0;

    sheets.forEach(sheet => {
        totalProgress += sheet.progress;
        totalIndex += sheet.index;

        if (sheet.status === 'issues') {
            kpi.issuesCount++;
        }
    });

    kpi.avgProgress = Math.round(totalProgress / sheets.length);
    kpi.avgIndex = (totalIndex / sheets.length).toFixed(2);
    kpi.progressChange = 5; // TODO: вычислить реальное изменение

    return kpi;
}

function renderKPI(kpi) {
    // Всего объектов
    document.querySelector('.kpi-card:nth-child(1) .kpi-value').textContent = kpi.total;

    // Средняя готовность
    const avgProgressEl = document.querySelector('.kpi-card:nth-child(2) .kpi-value');
    avgProgressEl.textContent = kpi.avgProgress + '%';
    avgProgressEl.className = 'kpi-value';
    if (kpi.avgProgress >= 90) avgProgressEl.classList.add('success');
    else if (kpi.avgProgress >= 70) avgProgressEl.classList.add('warning');
    else avgProgressEl.classList.add('danger');

    // Изменение
    const changeEl = document.querySelector('.kpi-card:nth-child(2) .kpi-change');
    changeEl.textContent = kpi.progressChange > 0 ?
        `↑ +${kpi.progressChange}% за неделю` :
        `↓ ${kpi.progressChange}% за неделю`;
    changeEl.className = 'kpi-change';
    changeEl.classList.add(kpi.progressChange > 0 ? 'positive' : 'negative');

    // С замечаниями
    const issuesEl = document.querySelector('.kpi-card:nth-child(3) .kpi-value');
    issuesEl.textContent = kpi.issuesCount;
    issuesEl.className = 'kpi-value';
    if (kpi.issuesCount > 0) issuesEl.classList.add('warning');

    // Средний индекс
    const indexEl = document.querySelector('.kpi-card:nth-child(4) .kpi-value');
    indexEl.textContent = kpi.avgIndex;
    indexEl.className = 'kpi-value';
    if (parseFloat(kpi.avgIndex) >= 0.95) indexEl.classList.add('success');
    else if (parseFloat(kpi.avgIndex) >= 0.85) indexEl.classList.add('warning');
    else indexEl.classList.add('danger');
}

function renderObjectsTable(sheets) {
    const container = document.querySelector('.dashboard-table-header').parentElement;
    if (!container) return;

    // Удалить старые вкладки и таблицы
    const oldTabs = container.querySelector('.tabs-container');
    if (oldTabs) oldTabs.remove();

    const oldTabContents = container.querySelectorAll('.tab-content');
    oldTabContents.forEach(content => content.remove());

    const oldTable = container.querySelector('.objects-table');
    if (oldTable) oldTable.remove();

    // Группировать объекты по типам
    const objectsByType = groupSheetsByObjectType(sheets);

    // Создать вкладки
    const tabsHtml = renderObjectTabs(objectsByType);

    container.insertAdjacentHTML('beforeend', tabsHtml);
}

function groupSheetsByObjectType(sheets) {
    const groups = {
        all: [],
        boiler: [],
        mkd: []
    };

    sheets.forEach(sheet => {
        groups.all.push(sheet);

        // Определить тип объекта из данных организаций
        const objectType = getObjectType(sheet.object_id);
        if (objectType && groups[objectType]) {
            groups[objectType].push(sheet);
        }
    });

    return groups;
}

function getObjectType(objectId) {
    if (!organizationsData) return null;

    // Поиск объекта в структуре организаций
    for (const omsu of organizationsData.omsu_list) {
        for (const eto of omsu.eto_list) {
            for (const tso of eto.tso_list) {
                const obj = tso.objects.find(o => o.id === objectId);
                if (obj) return obj.type;
            }
        }
    }
    return null;
}

function renderObjectTabs(objectsByType) {
    const tabs = [
        { id: 'all', name: 'Все объекты', icon: '📋', sheets: objectsByType.all },
        { id: 'boiler', name: 'Котельные', icon: '🔥', sheets: objectsByType.boiler },
        { id: 'mkd', name: 'МКД', icon: '🏠', sheets: objectsByType.mkd }
    ];

    let tabsNavHtml = '';
    let tabsContentHtml = '';

    tabs.forEach((tab, index) => {
        const isActive = index === 0 ? 'active' : '';

        tabsNavHtml += `
            <button class="tab-btn ${isActive}" data-tab="${tab.id}" onclick="switchObjectTab('${tab.id}')">
                <span class="tab-btn-icon">${tab.icon}</span>
                <span>${tab.name}</span>
                <span class="tab-btn-count">${tab.sheets.length}</span>
            </button>
        `;

        tabsContentHtml += `
            <div class="tab-content ${isActive}" data-tab-content="${tab.id}">
                ${renderObjectsTableForTab(tab.sheets)}
            </div>
        `;
    });

    return `
        <div class="tabs-container">
            <div class="tabs-nav">
                ${tabsNavHtml}
            </div>
        </div>
        ${tabsContentHtml}
    `;
}

function renderObjectsTableForTab(sheets) {
    if (sheets.length === 0) {
        return '<div class="empty-state">Нет объектов в этой категории</div>';
    }

    let html = `
        <div class="objects-table">
            <table>
                <thead>
                <tr>
                    <th>Объект</th>
                    <th>ТСО</th>
                    <th>Прогресс</th>
                    <th>Индекс</th>
                    <th>Статус</th>
                    <th>Активность</th>
                    <th></th>
                </tr>
                </thead>
                <tbody>
    `;

    sheets.forEach(sheet => {
        const progressClass = sheet.progress >= 90 ? '' :
            sheet.progress >= 70 ? 'medium' : 'low';
        const indexColor = sheet.index >= 0.95 ? 'var(--success)' :
            sheet.index >= 0.85 ? 'var(--warning)' : 'var(--danger)';
        const statusClass = sheet.status;
        const statusText = getStatusText(sheet.status);

        html += `
            <tr data-status="${statusClass}">
                <td><strong>${sheet.object_name}</strong></td>
                <td>${sheet.tso_name}</td>
                <td>
                    <div class="progress-cell">
                        <div class="progress-mini">
                            <div class="progress-mini-fill ${progressClass}" style="width: ${sheet.progress}%"></div>
                        </div>
                        <span class="progress-text">${sheet.progress}%</span>
                    </div>
                </td>
                <td><strong style="color: ${indexColor}">${sheet.index}</strong></td>
                <td><span class="status-indicator ${statusClass}">${statusText}</span></td>
                <td><small>${formatDate(sheet.last_activity)}</small></td>
                <td>
                    <button class="action-btn" onclick="showSheetDetail('${sheet.id}')">Открыть</button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
}

function switchObjectTab(tabId) {
    // Обновить активную вкладку
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

    // Показать соответствующий контент
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelector(`[data-tab-content="${tabId}"]`).classList.add('active');
}

function getStatusText(status) {
    const statusTexts = {
        'working': 'В работе ТСО',
        'review': 'На проверке',
        'issues': 'Есть замечания',
        'ready': 'Готово'
    };
    return statusTexts[status] || status;
}

// ===== FILTERS =====
function filterDashboard(filter) {
    // Обновить активный фильтр
    document.querySelectorAll('.quick-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Фильтровать строки во всех таблицах (во всех вкладках)
    const rows = document.querySelectorAll('.tab-content .objects-table tbody tr');
    rows.forEach(row => {
        const status = row.dataset.status;

        if (filter === 'all') {
            row.style.display = 'table-row';
        } else if (filter === 'issues' && status === 'issues') {
            row.style.display = 'table-row';
        } else if (filter === 'ready' && status === 'ready') {
            row.style.display = 'table-row';
        } else {
            row.style.display = 'none';
        }
    });
}

// ===== CHILD ORGANIZATIONS =====
function renderChildOrganizations(childSheets, parentType) {
    const wrapper = document.querySelector('#dashboardView .content-wrapper');
    if (!wrapper) return;

    // Удалить старый блок если есть
    const oldBlock = document.querySelector('.child-organizations');
    if (oldBlock) oldBlock.remove();

    if (childSheets.length === 0) return;

    const title = parentType === 'omsu'
        ? 'Организации на контроле (ЕТО и ТСО)'
        : 'Организации на контроле (ТСО)';

    let cardsHtml = '';
    childSheets.forEach(sheet => {
        if (!sheet.has_sheet) {
            // Карточка для организации без оценочного листа
            cardsHtml += `
                <div class="child-org-card" style="background: var(--gray-50); border: 2px dashed var(--gray-300);">
                    <div class="child-org-header" onclick="showDashboard('${sheet.org_type}', '${sheet.entity_id}', '${sheet.org_name}')">
                        <div class="child-org-info">
                            <span class="child-org-type">${sheet.org_type_name}</span>
                            <div class="child-org-name">${sheet.org_name}</div>
                            ${sheet.parent_name ? `<div class="child-org-parent">${sheet.parent_name}</div>` : ''}
                        </div>
                        <span class="child-org-sheet-number" style="color: var(--gray-400);">Не создан</span>
                    </div>

                    <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px; text-align: center;">
                        <svg width="48" height="48" fill="none" stroke="var(--gray-400)" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <div style="font-size: 14px; color: var(--gray-600);">Оценочный лист не создан</div>
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); createOrganizationSheet('${sheet.org_type}', '${sheet.entity_id}', '${sheet.org_type}')" style="font-size: 12px; padding: 6px 12px;">
                            Создать ОЛ
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Обычная карточка с данными
            const progressClass = sheet.progress >= 90 ? '' :
                sheet.progress >= 70 ? 'medium' : 'low';
            const indexColor = sheet.index >= 0.95 ? 'success' :
                sheet.index >= 0.85 ? 'warning' : 'danger';
            const statusClass = sheet.overall_status || sheet.status;
            const statusText = getStatusText(statusClass);

            cardsHtml += `
                <div class="child-org-card">
                    <div class="child-org-header" onclick="showDashboard('${sheet.org_type}', '${sheet.entity_id}', '${sheet.org_name}')">
                        <div class="child-org-info">
                            <span class="child-org-type">${sheet.org_type_name}</span>
                            <div class="child-org-name">${sheet.org_name}</div>
                            ${sheet.parent_name ? `<div class="child-org-parent">${sheet.parent_name}</div>` : ''}
                        </div>
                        <span class="child-org-sheet-number">${sheet.sheet_number}</span>
                    </div>

                    <div class="child-org-stats" onclick="showDashboard('${sheet.org_type}', '${sheet.entity_id}', '${sheet.org_name}')">
                        <div class="child-org-stat">
                            <span class="child-org-stat-label">Индекс</span>
                            <span class="child-org-stat-value ${indexColor}">${sheet.index}</span>
                        </div>
                        <div class="child-org-stat">
                            <span class="child-org-stat-label">Документы</span>
                            <span class="child-org-stat-value">${sheet.docs_approved}/${sheet.docs_total}</span>
                        </div>
                    </div>

                    <div class="child-org-progress" onclick="showDashboard('${sheet.org_type}', '${sheet.entity_id}', '${sheet.org_name}')">
                        <div class="child-org-progress-bar">
                            <div class="child-org-progress-fill ${progressClass}" style="width: ${sheet.progress}%"></div>
                        </div>
                        <div class="child-org-progress-text">Прогресс: ${sheet.progress}%</div>
                    </div>

                    <div class="child-org-footer">
                        <span class="child-org-docs" onclick="showDashboard('${sheet.org_type}', '${sheet.entity_id}', '${sheet.org_name}')">Объектов: ${sheet.objects_count || 0}</span>
                        <button class="btn-view-sheet" onclick="event.stopPropagation(); showSheetDetail('${sheet.id}')" title="Открыть оценочный лист">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                            ОЛ
                        </button>
                    </div>
                </div>
            `;
        }
    });

    const blockHtml = `
        <div class="child-organizations">
            <h3>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                ${title}
            </h3>
            <div class="child-orgs-grid">
                ${cardsHtml}
            </div>
        </div>
    `;

    // Вставить блок после карточки организации или в начало
    const orgSection = wrapper.querySelector('.organization-sheet-section');
    if (orgSection) {
        orgSection.insertAdjacentHTML('afterend', blockHtml);
    } else {
        wrapper.insertAdjacentHTML('afterbegin', blockHtml);
    }
}

// ===== ORGANIZATION ACTIONS =====
function createOrganizationSheet(type, id, orgType) {
    console.log('Создание оценочного листа для организации:', type, id);
    // TODO: Реализовать создание оценочного листа
    alert('Функция создания оценочного листа будет реализована.\n\nТип: ' + type + '\nID: ' + id);
}

function createAct(sheetId) {
    console.log('Создание акта для листа:', sheetId);
    // TODO: Реализовать создание акта
    alert('Функция создания акта будет реализована');
}

function createPassport(sheetId) {
    console.log('Создание паспорта для листа:', sheetId);
    // TODO: Реализовать создание паспорта
    alert('Функция создания паспорта будет реализована');
}

// ===== REMARKS =====
function renderRemarks(sheet) {
    const wrapper = document.querySelector('#dashboardView .content-wrapper');
    if (!wrapper) return;

    // Удалить старый блок если есть
    const oldBlock = document.querySelector('.dashboard-remarks');
    if (oldBlock) oldBlock.remove();

    const remarks = sheet.remarks || [];
    if (remarks.length === 0) return; // Если замечаний нет, не показываем блок

    let remarksHtml = '';
    remarks.forEach(remark => {
        remarksHtml += `
            <div class="remark-item">
                <div class="remark-header">
                    <div class="remark-object">
                        <strong>${remark.object_name}</strong>
                        <span class="remark-item-number">п. ${remark.item_number}</span>
                    </div>
                    <span class="remark-time">${formatDate(remark.created_at)}</span>
                </div>
                <div class="remark-text">${remark.text}</div>
                <div class="remark-author">
                    <span class="remark-author-name">${remark.author}</span>
                    <span class="remark-author-role">${remark.author_role}</span>
                </div>
            </div>
        `;
    });

    const blockHtml = `
        <div class="dashboard-remarks">
            <h3>Активные замечания</h3>
            <div class="remarks-list">
                ${remarksHtml}
            </div>
        </div>
    `;

    wrapper.insertAdjacentHTML('beforeend', blockHtml);
}

// ===== ACTIVITY HISTORY =====
function renderActivityHistory(sheet) {
    const wrapper = document.querySelector('#dashboardView .content-wrapper');
    if (!wrapper) return;

    // Удалить старый блок если есть
    const oldBlock = document.querySelector('.dashboard-activity');
    if (oldBlock) oldBlock.remove();

    const activities = sheet.activity_history || [];
    if (activities.length === 0) return; // Если истории нет, не показываем блок

    const actionIcons = {
        'approved': '✓',
        'comment': '💬',
        'uploaded': '📎',
        'rejected': '✗'
    };

    const actionClasses = {
        'approved': 'success',
        'comment': 'info',
        'uploaded': 'primary',
        'rejected': 'danger'
    };

    let activitiesHtml = '';
    activities.forEach(activity => {
        const icon = actionIcons[activity.action] || '•';
        const activityClass = actionClasses[activity.action] || 'default';

        activitiesHtml += `
            <div class="activity-item">
                <div class="activity-icon ${activityClass}">${icon}</div>
                <div class="activity-content">
                    <div class="activity-header">
                        <span class="activity-text">${activity.text}</span>
                        <span class="activity-time">${formatDate(activity.timestamp)}</span>
                    </div>
                    <div class="activity-details">
                        <span class="activity-object">${activity.object_name}</span>
                        <span class="activity-item-number">п. ${activity.item_number}</span>
                    </div>
                    <div class="activity-author">
                        ${activity.author} (${activity.author_role})
                    </div>
                </div>
            </div>
        `;
    });

    const blockHtml = `
        <div class="dashboard-activity">
            <h3>История последних действий</h3>
            <div class="activity-list">
                ${activitiesHtml}
            </div>
        </div>
    `;

    wrapper.insertAdjacentHTML('beforeend', blockHtml);
}