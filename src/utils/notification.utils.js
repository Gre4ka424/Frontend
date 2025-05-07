// notification.utils.js

/**
 * Показывает уведомление пользователю
 * @param {string} message - Текст уведомления
 * @param {string} type - Тип уведомления ('success', 'error', 'info')
 */
export function showNotification(message, type = 'success') {
  // Удаляем предыдущие уведомления, если они есть
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(note => {
    if (note.parentNode) {
      document.body.removeChild(note);
    }
  });
  
  // Создание элемента уведомления
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Добавление в DOM
  document.body.appendChild(notification);
  
  // Стилизация уведомления
  Object.assign(notification.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 20px',
    backgroundColor: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3',
    color: 'white',
    borderRadius: '4px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    zIndex: '1000',
    opacity: '0',
    transform: 'translateY(20px)',
    transition: 'opacity 0.3s, transform 0.3s'
  });
  
  // Анимация появления
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // Удаление через 3 секунды
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    setTimeout(() => {
      // Проверяем, существует ли элемент перед удалением
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}