// user.utils.js

/**
 * Обновляет UI для авторизованного пользователя
 * @param {Object} userData - Данные пользователя
 */
export function updateUIForAuthenticatedUser(userData) {
  if (!userData || !userData.username) {
    console.error('Invalid user data provided:', userData);
    return;
  }

  console.log('Updating UI for authenticated user:', userData.username);
  
  try {
    // Создаем аватар пользователя в шапке
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
      console.error('Sidebar element not found, attempting to find alternative container');
      // Пробуем найти альтернативный контейнер
      const altContainer = document.querySelector('header') || document.querySelector('nav');
      if (!altContainer) {
        console.error('No suitable container found for user avatar');
        return;
      }
      
      updateUserInterface(altContainer, userData);
    } else {
      updateUserInterface(sidebar, userData);
    }
    
    // Обновляем состояние авторизации на всех страницах
    updateAuthState(true);
  } catch (error) {
    console.error('Error updating UI for authenticated user:', error);
  }
}

/**
 * Обновляет элементы интерфейса для авторизованного пользователя
 * @param {HTMLElement} container - Контейнер для элементов UI
 * @param {Object} userData - Данные пользователя
 */
function updateUserInterface(container, userData) {
  if (!container) return;
  
  // Проверяем, нет ли уже аватара
  let existingAvatar = document.querySelector('.user-avatar');
  if (existingAvatar) {
    console.log('Removing existing avatar');
    existingAvatar.remove();
  }
  
  // Генерируем цвет аватара на основе имени пользователя
  const avatarColor = generateColorFromString(userData.username);
  const avatarLetter = userData.username.charAt(0).toUpperCase();
  
  // Создаем аватар и вставляем его в контейнер
  const userAvatar = document.createElement('div');
  userAvatar.classList.add('user-avatar');
  userAvatar.style.backgroundColor = avatarColor;
  userAvatar.textContent = avatarLetter;
  
  console.log('Created user avatar with letter:', avatarLetter);
  
  // Делаем аватар кликабельным
  userAvatar.addEventListener('click', toggleUserDropdown);
  
  // Добавляем аватар в контейнер
  container.appendChild(userAvatar);
  
  // Создаем выпадающее меню для пользователя
  createUserDropdown(container, userData);
  
  // Добавляем обработчик для закрытия меню при клике вне его
  document.removeEventListener('click', closeDropdownOnClickOutside); // Убираем существующий обработчик
  document.addEventListener('click', closeDropdownOnClickOutside);
}

/**
 * Создает выпадающее меню пользователя
 * @param {HTMLElement} container - Контейнер для добавления меню
 * @param {Object} userData - Данные пользователя
 */
function createUserDropdown(container, userData) {
  // Удаляем существующее меню, если оно есть
  const existingDropdown = document.querySelector('.user-dropdown');
  if (existingDropdown) {
    existingDropdown.remove();
  }
  
  // Создаем выпадающее меню
  const dropdown = document.createElement('div');
  dropdown.classList.add('user-dropdown');
  dropdown.style.display = 'none'; // По умолчанию скрыто
  
  // Создаем заголовок выпадающего меню с информацией о пользователе
  const dropdownHeader = document.createElement('div');
  dropdownHeader.classList.add('dropdown-header');
  
  const username = document.createElement('span');
  username.classList.add('username');
  username.textContent = userData.username;
  
  const email = document.createElement('span');
  email.classList.add('email');
  email.textContent = userData.email;
  
  dropdownHeader.appendChild(username);
  dropdownHeader.appendChild(email);
  
  // Создаем список пунктов меню
  const dropdownMenu = document.createElement('ul');
  dropdownMenu.classList.add('dropdown-menu');
  
  // Добавляем пункты меню
  const menuItems = [
    { label: 'Мой профиль', action: () => { if (window.router) window.router.navigate('/profile'); } },
    { label: 'Настройки', action: () => { if (window.router) window.router.navigate('/settings'); } },
    { label: 'Выйти', action: () => { 
      if (window.MeetHere && window.MeetHere.apiService) {
        window.MeetHere.apiService.logout();
      } else {
        console.warn('apiService not found in MeetHere global object');
        // Резервный вариант для выхода
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token_type');
        localStorage.removeItem('user_data');
        if (window.router) window.router.navigate('/');
        else window.location.href = '/';
      }
    }}
  ];
  
  menuItems.forEach(item => {
    const menuItem = document.createElement('li');
    menuItem.textContent = item.label;
    menuItem.addEventListener('click', item.action);
    dropdownMenu.appendChild(menuItem);
  });
  
  // Собираем выпадающее меню
  dropdown.appendChild(dropdownHeader);
  dropdown.appendChild(dropdownMenu);
  
  // Добавляем меню в контейнер
  container.appendChild(dropdown);
}

/**
 * Переключает видимость выпадающего меню пользователя
 */
export function toggleUserDropdown() {
  const dropdown = document.querySelector('.user-dropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }
}

/**
 * Закрывает выпадающее меню при клике вне его
 * @param {Event} event - Событие клика
 */
function closeDropdownOnClickOutside(event) {
  const dropdown = document.querySelector('.user-dropdown');
  const avatar = document.querySelector('.user-avatar');
  
  if (dropdown && dropdown.style.display === 'block' && !dropdown.contains(event.target) && event.target !== avatar) {
    dropdown.style.display = 'none';
  }
}

/**
 * Генерирует цвет на основе строки
 * @param {string} str - Строка для генерации цвета (обычно имя пользователя)
 * @returns {string} - Цвет в формате HEX
 */
export function generateColorFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
}

/**
 * Обновляет состояние авторизации на страницах
 * @param {boolean} isAuthenticated - Флаг авторизации
 */
function updateAuthState(isAuthenticated) {
  // Скрываем или показываем элементы в зависимости от состояния авторизации
  const loginLinks = document.querySelectorAll('a[href="/login"]');
  const registerLinks = document.querySelectorAll('a[href="/register"]');
  const profileLinks = document.querySelectorAll('a[href="/profile"]');
  
  loginLinks.forEach(link => {
    if (link) link.style.display = isAuthenticated ? 'none' : 'block';
  });
  
  registerLinks.forEach(link => {
    if (link) link.style.display = isAuthenticated ? 'none' : 'block';
  });
  
  profileLinks.forEach(link => {
    if (link) link.style.display = isAuthenticated ? 'block' : 'none';
  });
} 