// ===== NOTIFICATIONS =====

function renderNotifications() {
    if (!notificationsData) return;

    const dropdownBody = document.getElementById('notificationsBody');
    const badge = document.querySelector('.notifications-badge');

    if (!dropdownBody) return;

    // Обновить badge
    if (notificationsData.unread_count > 0) {
        badge.textContent = notificationsData.unread_count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    // Отрисовать список уведомлений
    let html = '';

    notificationsData.notifications.forEach(notif => {
        const iconClass = notif.type;
        const icon = getNotificationIcon(notif.type);
        const unreadClass = notif.is_read ? '' : 'unread';

        html += `
            <div class="notification-item ${unreadClass}" onclick="openFromNotification('${notif.sheet_id}', '${notif.item_number}')">
                <div class="notification-icon ${iconClass}">
                    ${icon}
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notif.object_name}</div>
                    <div class="notification-text">${notif.text}</div>
                    <div class="notification-time">${formatDate(notif.created_at)}</div>
                </div>
            </div>
        `;
    });

    dropdownBody.innerHTML = html;
}

function getNotificationIcon(type) {
    const icons = {
        'comment': '💬',
        'approved': '✓',
        'rejected': '❌',
        'warning': '⚠️'
    };
    return icons[type] || '📋';
}

function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    dropdown.classList.toggle('active');
}

function clearNotifications() {
    if (!notificationsData) return;

    // Пометить все как прочитанные
    notificationsData.notifications.forEach(notif => {
        notif.is_read = true;
    });
    notificationsData.unread_count = 0;

    // Обновить UI
    const badge = document.querySelector('.notifications-badge');
    badge.classList.add('hidden');

    document.querySelectorAll('.notification-item.unread').forEach(item => {
        item.classList.remove('unread');
    });
}

function openFromNotification(sheetId, itemNumber) {
    // Закрыть dropdown
    const dropdown = document.getElementById('notificationsDropdown');
    dropdown.classList.remove('active');

    // Пометить уведомление как прочитанное
    markNotificationAsRead(sheetId, itemNumber);

    // Перейти к детальному листу
    showSheetDetail(sheetId, itemNumber);
}

function markNotificationAsRead(sheetId, itemNumber) {
    if (!notificationsData) return;

    const notif = notificationsData.notifications.find(n =>
        n.sheet_id === sheetId && n.item_number === itemNumber
    );

    if (notif && !notif.is_read) {
        notif.is_read = true;
        notificationsData.unread_count = Math.max(0, notificationsData.unread_count - 1);

        // Обновить badge
        const badge = document.querySelector('.notifications-badge');
        if (notificationsData.unread_count > 0) {
            badge.textContent = notificationsData.unread_count;
        } else {
            badge.classList.add('hidden');
        }
    }
}

// Закрытие dropdown при клике вне
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('notificationsDropdown');
    const btn = document.querySelector('.notifications-btn');

    if (dropdown && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});