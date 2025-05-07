// В начале файла добавляем импорты
import apiService from '/src/services/api.service.js';
import { showNotification } from '/src/utils/notification.utils.js';
import { updateUIForAuthenticatedUser, generateColorFromString, toggleUserDropdown } from '/src/utils/user.utils.js';
import { formatDate } from '/src/utils/format.utils.js';

// Определяем глобальную константу API_URL, доступную во всех функциях
const API_URL = 'https://backend-production-c34f.up.railway.app';

// Основные функции для MeetHere сайта
document.addEventListener('DOMContentLoaded', async function() {
    // Обработка модального окна регистрации и входа
    initAuthForms();

    // Инициализация мобильного меню
    initMobileMenu();

    // Инициализация галереи приложений
    initGallery();

    // Обработчик для кнопки футера
    initFooterButton();

    // Расширяем обработку форм авторизации
    enhanceAuthForms();

    // Инициализируем вкладки профиля
    initProfileTabs();
    
    // Проверяем, находимся ли мы на странице профиля
    if (window.location.pathname === '/profile') {
        initProfileSettings();
        initProfilePhoto();  // Инициализация загрузки фотографии профиля
    }
    
    // Проверяем, находимся ли мы на странице настроек
    if (window.location.pathname === '/settings') {
        initSettingsPage();
    }
    
    // Проверяем, находимся ли мы на странице создания мероприятия
    if (window.location.pathname === '/create-event') {
        initCreateEventPage();
    }
    
    // Проверка авторизации
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      try {
        // Проверяем валидность токена
        const isValid = await apiService.checkTokenValidity();
        if (isValid) {
          // Загружаем профиль пользователя
          await fetchUserProfile();
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
    }
    
    // Следим за изменениями URL для активации необходимых функций
    window.addEventListener('popstate', function() {
        checkCurrentPageAndInit();
    });
    
    // Также подписываемся на события роутера при смене маршрута
    if (window.router) {
        const originalNavigate = window.router.navigate;
        window.router.navigate = function(path) {
            originalNavigate.call(window.router, path);
            setTimeout(() => {
                checkCurrentPageAndInit();
            }, 100);
        };
    }
});

// Функция проверки текущей страницы и инициализации нужных модулей
function checkCurrentPageAndInit() {
    console.log('URL changed, current path:', window.location.pathname);
    
    if (window.location.pathname === '/profile') {
        console.log('Initializing profile page');
        setTimeout(() => {
            initProfileSettings();
            initProfileTabs();
        }, 300);
    } else if (window.location.pathname === '/settings') {
        console.log('Initializing settings page');
        initSettingsPage();
    } else if (window.location.pathname === '/create-event') {
        console.log('Initializing create event page');
        initCreateEventPage();
    } else if (window.location.pathname === '/events') {
        console.log('Initializing events page');
        initEventsPage();
    } else if (window.location.pathname.startsWith('/events/')) {
        console.log('Initializing event details page');
        initEventDetailsPage();
    } else if (window.location.pathname.startsWith('/edit-event/')) {
        console.log('Initializing edit event page');
        initEditEventPage();
    }
}

// Функция для инициализации языкового переключателя
function initLanguageSwitcher() {
    // Получение текущего языка из localStorage или установка по умолчанию
    let currentLang = localStorage.getItem('selectedLanguage') || 'en';
    
    // Применение текущего языка при загрузке
    applyLanguage(currentLang);
    
    // Подсветка активной кнопки языка
    const langButtons = document.querySelectorAll('.lang-btn');
    langButtons.forEach(btn => {
        if (btn.getAttribute('data-lang') === currentLang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
        
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            currentLang = lang;
            
            // Сохранение выбранного языка
            localStorage.setItem('selectedLanguage', lang);
            
            // Удаление активного класса у всех кнопок
            langButtons.forEach(b => b.classList.remove('active'));
            
            // Добавление активного класса к нажатой кнопке
            this.classList.add('active');
            
            // Применение языка
            applyLanguage(lang);
            
            // Если есть роутер, переключаем язык в нем тоже
            if (window.router && typeof window.router.switchLanguage === 'function') {
                window.router.switchLanguage(lang);
            }
        });
    });
}

// Экспорт функций для использования в других скриптах
window.MeetHere = {
    showNotification,
    apiService
};

// Инициализация форм авторизации и регистрации
function initAuthForms() {
    // Получаем элементы DOM для форм авторизации
    const loginBtn = document.querySelector('a[href="/login"]');
    const registerBtn = document.querySelector('a[href="/register"]');
    
    // Обработчики для кнопок авторизации и регистрации в навигации
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            // Если у нас есть роутер, используем его
            if (window.router && typeof window.router.navigate === 'function') {
                e.preventDefault();
                window.router.navigate('/login');
            }
            // Если нет роутера, позволяем стандартную навигацию браузера
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            // Если у нас есть роутер, используем его
            if (window.router && typeof window.router.navigate === 'function') {
                e.preventDefault();
                window.router.navigate('/register');
            }
            // Если нет роутера, позволяем стандартную навигацию браузера
        });
    }
}

// Инициализация мобильного меню
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Закрытие мобильного меню при переходе на страницу профиля
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.getAttribute('href') === '/profile' && sidebar) {
            sidebar.classList.remove('active');
        }
    });
}

// Инициализация галереи
function initGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    if (galleryItems.length > 0) {
        galleryItems.forEach(item => {
            item.addEventListener('mouseenter', function() {
                const img = this.querySelector('img');
                if (img) {
                    img.style.transform = 'scale(1.05)';
                }
            });
            
            item.addEventListener('mouseleave', function() {
                const img = this.querySelector('img');
                if (img) {
                    img.style.transform = 'scale(1)';
                }
            });
        });
    }
}

// Инициализация кнопки футера
function initFooterButton() {
    const footerBtn = document.querySelector('.footer-btn');
    
    if (footerBtn) {
        footerBtn.addEventListener('click', function() {
            if (window.router && typeof window.router.navigate === 'function') {
                window.router.navigate('/contact');
            } else {
                window.location.href = '/contact';
            }
        });
    }
}

// Обновленные функции для интеграции с реальным API

// 1. Функция для авторизации пользователя
async function loginUser(username, password) {
  try {
    console.log('Attempting to login with credentials:', username);
    
    // Проверки на корректность входных данных
    if (!username || !password) {
      throw new Error('Имя пользователя и пароль не могут быть пустыми');
    }
    
    // Авторизуемся через API
    const loginData = await apiService.login(username, password);
    
    if (!loginData || !loginData.access_token) {
      throw new Error('Не удалось получить токен доступа');
    }
    
    console.log('Login successful, token received. Fetching profile...');
    
    // Получаем данные профиля пользователя
    const userData = await fetchUserProfile();
    
    // Показываем уведомление
    showNotification('Вход выполнен успешно!', 'success');
    
    console.log('Profile loaded, redirecting to profile page...');
    
    // Перенаправляем на страницу профиля
    forceRedirectToProfile();
    
    return userData;
  } catch (error) {
    console.error('Ошибка при авторизации:', error);
    showNotification(error.message || 'Ошибка авторизации', 'error');
    throw error;
  }
}

// Функция принудительного перенаправления на профиль
function forceRedirectToProfile() {
  console.log('Forcing redirection to profile page');
  
  // Сохраняем флаг, что нужно перейти на профиль
  sessionStorage.setItem('redirectToProfile', 'true');
  
  // Функция для проверки и выполнения перехода
  const checkAndRedirect = () => {
    if (window.location.pathname === '/profile') {
      console.log('Already on profile page, initializing components');
      setTimeout(() => {
        initProfileSettings();
        initProfileTabs();
      }, 300);
      return true;
    }
    
    console.log('Attempting to navigate to /profile');
    // Пытаемся использовать router если он доступен
    if (window.router && typeof window.router.navigate === 'function') {
      window.router.navigate('/profile');
      
      // Для гарантии инициализируем страницу профиля после перенаправления
      setTimeout(() => {
        console.log('Initialize profile page after redirect');
        initProfileSettings();
        initProfileTabs();
      }, 500);
    } else {
      // Запасной вариант - используем стандартный redirect
      window.location.href = '/profile';
    }
    
    return false;
  };
  
  // Сначала пытаемся перейти сразу
  if (checkAndRedirect()) return;
  
  // Если не удалось, пробуем еще раз через 300мс
  setTimeout(() => {
    if (window.location.pathname !== '/profile') {
      console.log('First retry to navigate to profile');
      if (!checkAndRedirect()) {
        // Если снова не удалось, делаем последнюю попытку через 800мс
        setTimeout(() => {
          if (window.location.pathname !== '/profile') {
            console.log('Final attempt to navigate to profile');
            if (window.router && typeof window.router.navigate === 'function') {
              window.router.navigate('/profile');
            } else {
              window.location.href = '/profile';
            }
          }
        }, 800);
      }
    }
  }, 300);
}

// 2. Функция для получения профиля пользователя
export async function fetchUserProfile() {
  try {
    // Получаем профиль через API сервис
    const profileData = await apiService.fetchProfile();
    
    if (!profileData) {
      throw new Error('Failed to get profile data');
    }
    
    // Сохраняем данные в localStorage
    const userData = {
      id: null,
      username: "",
      email: "",
      joinDate: formatDate(new Date()),
      interests: profileData.interests || [],
      groups: profileData.joined_groups || [],
      location: "Not specified",
      isAdmin: false,
      onboardingCompleted: profileData.onboarding_completed || false,
      profile_photo: profileData.profile_photo || null
    };
    
    // Получаем дополнительные данные пользователя через API сервис
    try {
      const userDetailsData = await apiService.getUserDetails();
      
      if (userDetailsData) {
        userData.id = userDetailsData.id;
        userData.username = userDetailsData.username;
        userData.email = userDetailsData.email;
        
        // Обрабатываем дату с проверкой формата
        let joinDate;
        if (userDetailsData.created_at) {
          try {
            joinDate = new Date(userDetailsData.created_at);
            // Проверяем, является ли дата валидной
            if (isNaN(joinDate.getTime())) {
              joinDate = new Date(); // Если неверный формат, используем текущую дату
            }
          } catch (e) {
            joinDate = new Date(); // В случае ошибки используем текущую дату
          }
        } else {
          joinDate = new Date();
        }
        userData.joinDate = formatDate(joinDate);
        
        userData.isAdmin = userDetailsData.is_admin || false;
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      // Продолжаем выполнение с базовыми данными профиля
    }
    
    localStorage.setItem('user_data', JSON.stringify(userData));
    
    // Обновляем UI для авторизованного пользователя
    updateUIForAuthenticatedUser(userData);
    
    return userData;
  } catch (error) {
    console.error('Ошибка при получении профиля:', error);
    throw error;
  }
}

// 3. Функция для регистрации пользователя
async function registerUser(username, email, password) {
    try {
        // Используем apiService для регистрации
        const data = await apiService.registerUser(username, email, password);
        
        // После успешной регистрации НЕ делаем автоматический вход
        // а просто показываем уведомление и перенаправляем на страницу логина
        showNotification('Регистрация выполнена успешно! Теперь вы можете войти в систему.', 'success');
        
        // Перенаправляем на страницу входа вместо автоматического входа
        setTimeout(() => {
            if (window.router) {
                window.router.navigate('/login');
            } else {
                window.location.href = '/login';
            }
        }, 1500);
        
        return data;
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        throw error;
    }
}

// 4. Функция для обновления профиля пользователя
async function updateUserProfile(profileData) {
  return apiService.updateProfile(profileData);
}

// 5. Функция для выхода из системы
function logout() {
  apiService.logout();
}

// Расширение обработки форм авторизации и регистрации
function enhanceAuthForms() {
    // Обработка формы входа
    document.addEventListener('submit', async function(e) {
        // Проверяем, что это действительно форма входа
        if (e.target && e.target.id === 'login-form') {
            e.preventDefault();
            
            // Получаем поля ввода
            const usernameInput = e.target.querySelector('input[name="username"]');
            const passwordInput = e.target.querySelector('input[name="password"]');
            const submitButton = e.target.querySelector('button[type="submit"]');
            
            if (!usernameInput || !passwordInput) {
                console.error('Form fields are missing');
                return;
            }
            
            // Получаем значения полей
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!username || !password) {
                showNotification('Пожалуйста, заполните все поля', 'error');
                return;
            }
            
            // Меняем текст кнопки и блокируем ее на время операции
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Loading...';
            }
            
            try {
                console.log('Attempting to login user');
                // Вызываем функцию авторизации и ждем завершения
                await loginUser(username, password);
                // Дополнительно форсируем редирект - на случай, если что-то пошло не так
                forceRedirectToProfile();
            } catch (error) {
                console.error('Login error:', error);
                showNotification(error.message || 'Ошибка входа. Неверное имя пользователя или пароль.', 'error');
            } finally {
                // Восстанавливаем состояние кнопки
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Login';
                }
            }
        }
        
        // Обработка формы регистрации
        if (e.target && e.target.id === 'register-form') {
            e.preventDefault();
            
            // Получаем поля ввода
            const usernameInput = e.target.querySelector('input[name="username"]');
            const emailInput = e.target.querySelector('input[name="email"]');
            const passwordInput = e.target.querySelector('input[name="password"]');
            const submitButton = e.target.querySelector('button[type="submit"]');
            
            if (!usernameInput || !emailInput || !passwordInput) {
                console.error('Form fields are missing');
                return;
            }
            
            // Получаем значения полей
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!username || !email || !password) {
                showNotification('Пожалуйста, заполните все поля', 'error');
                return;
            }
            
            // Проверка email регулярным выражением
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showNotification('Пожалуйста, введите корректный email адрес', 'error');
                return;
            }
            
            // Проверка пароля на минимальную длину
            if (password.length < 6) {
                showNotification('Пароль должен содержать не менее 6 символов', 'error');
                return;
            }
            
            // Меняем текст кнопки и блокируем ее на время операции
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Loading...';
            }
            
            try {
                // Вызываем функцию регистрации
                await registerUser(username, email, password);
                // Уведомление и перенаправление уже реализованы в функции registerUser
            } catch (error) {
                console.error('Registration error:', error);
                showNotification(error.message || 'Ошибка регистрации. Пожалуйста, попробуйте еще раз.', 'error');
            } finally {
                // Восстанавливаем состояние кнопки
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Register';
                }
            }
        }
    });
}

// Инициализация вкладок профиля
function initProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // Удаляем активный класс у всех вкладок
                tabs.forEach(t => t.classList.remove('active'));
                
                // Добавляем активный класс текущей вкладке
                this.classList.add('active');
                
                // Скрываем все контенты вкладок
                tabContents.forEach(content => content.style.display = 'none');
                
                // Показываем выбранный контент
                const tabId = this.getAttribute('data-tab');
                const selectedContent = document.getElementById(tabId);
                if (selectedContent) {
                    selectedContent.style.display = 'block';
                }
            });
        });
        
        // Активируем первую вкладку по умолчанию
        tabs[0].click();
    }
}

// Инициализация настроек профиля
function initProfileSettings() {
    console.log('Initializing profile settings...');
    
    // Вместо setTimeout используем функцию, которая будет пытаться найти кнопку несколько раз
    let attempts = 0;
    const maxAttempts = 5;
    
    const initSettingsButton = function() {
        // Находим кнопку настроек и обрабатываем ее клик
        const settingsButton = document.getElementById('profileSettingsBtn');
        if (settingsButton) {
            console.log('Found settings button:', settingsButton);
            
            // Удаляем существующие обработчики, чтобы избежать дублирования
            settingsButton.removeEventListener('click', toggleSettingsDropdown);
            
            // Добавляем обработчик клика
            settingsButton.addEventListener('click', toggleSettingsDropdown);
            
            // Закрываем меню настроек при клике вне его
            document.removeEventListener('click', handleOutsideClick);
            document.addEventListener('click', handleOutsideClick);
            
            // Обрабатываем клики на элементы выпадающего меню
            setupDropdownItemsHandlers();
            
            return true; // Успешно инициализировали
        } else {
            console.log(`Settings button not found with selector #profileSettingsBtn (attempt ${attempts + 1}/${maxAttempts})`);
            attempts++;
            
            // Если превысили лимит попыток, прекращаем попытки
            if (attempts >= maxAttempts) {
                console.error('Failed to find settings button after maximum attempts');
                return true; // Прекращаем попытки
            }
            
            return false; // Продолжаем попытки
        }
    };
    
    // Пытаемся инициализировать, и если не получилось, пробуем каждые 300мс
    if (!initSettingsButton()) {
        const interval = setInterval(() => {
            if (initSettingsButton()) {
                clearInterval(interval);
            }
        }, 300);
    }
    
    // Инициализация загрузки и отображения фото профиля
    initProfilePhoto();
}

// Функция для инициализации загрузки и отображения фото профиля
function initProfilePhoto() {
    const changePhotoBtn = document.querySelector('.change-photo-btn');
    
    if (changePhotoBtn) {
        console.log('Initializing profile photo upload functionality');
        
        // Создаем скрытый input для выбора файла
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Обработчик клика по кнопке "Change profile photo"
        changePhotoBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Обработчик выбора файла
        fileInput.addEventListener('change', async (e) => {
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                
                // Проверка размера и типа файла
                if (file.size > 5 * 1024 * 1024) { // 5MB
                    showNotification('File is too large. Maximum size is 5MB', 'error');
                    return;
                }
                
                if (!file.type.startsWith('image/')) {
                    showNotification('Only image files are allowed', 'error');
                    return;
                }
                
                try {
                    // Показываем индикатор загрузки
                    changePhotoBtn.textContent = 'Uploading...';
                    changePhotoBtn.disabled = true;
                    
                    // Загружаем файл на сервер
                    const result = await apiService.uploadProfilePhoto(file);
                    
                    if (result && result.photo_url) {
                        // Получаем элемент аватара
                        const avatar = document.querySelector('.profile-avatar');
                        if (avatar) {
                            // Обновляем аватар в профиле
                            avatar.innerHTML = '';
                            const img = document.createElement('img');
                            img.src = result.photo_url;
                            img.style.width = '100%';
                            img.style.height = '100%';
                            img.style.objectFit = 'cover';
                            img.style.borderRadius = '50%';
                            avatar.appendChild(img);
                        }
                    }
                    
                    showNotification('Profile photo updated successfully', 'success');
                } catch (error) {
                    console.error('Error uploading photo:', error);
                    showNotification(error.message || 'Error uploading photo', 'error');
                } finally {
                    // Восстанавливаем текст кнопки
                    changePhotoBtn.textContent = 'Change profile photo';
                    changePhotoBtn.disabled = false;
                }
            }
        });
    } else {
        console.log('Change photo button not found in the DOM');
    }
}

// Функция для переключения видимости выпадающего меню
function toggleSettingsDropdown(event) {
    if (event) event.stopPropagation();
    console.log('Toggle settings dropdown');
    const settingsDropdown = document.getElementById('settingsDropdown');
    if (settingsDropdown) {
        const isVisible = settingsDropdown.style.display === 'block';
        settingsDropdown.style.display = isVisible ? 'none' : 'block';
        console.log('Dropdown visibility toggled to:', !isVisible);
    } else {
        console.error('Dropdown element not found with id settingsDropdown');
    }
}

// Обработчик клика вне меню
function handleOutsideClick(event) {
    const settingsDropdown = document.getElementById('settingsDropdown');
    const settingsButton = document.getElementById('profileSettingsBtn');
    
    if (settingsDropdown && 
        settingsDropdown.style.display === 'block' && 
        !settingsDropdown.contains(event.target) && 
        event.target !== settingsButton) {
        settingsDropdown.style.display = 'none';
    }
}

// Настройка обработчиков для элементов выпадающего меню
function setupDropdownItemsHandlers() {
    const editProfileBtn = document.querySelector('.edit-profile-btn');
    const createEventBtn = document.querySelector('.create-event-btn');
    const logoutBtn = document.querySelector('.logout-btn');
    
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Edit profile clicked');
            if (window.router) window.router.navigate('/settings');
        });
    }
    
    if (createEventBtn) {
        createEventBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Create event clicked');
            if (window.router) window.router.navigate('/create-event');
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Logout clicked');
            logout();
        });
    }
}

// Инициализация страницы настроек
function initSettingsPage() {
    const settingsForm = document.getElementById('profile-settings-form');
    
    if (settingsForm) {
        // Разрешаем редактирование имени пользователя
        const displayNameInput = document.querySelector('input[name="display-name"]');
        if (displayNameInput) {
            displayNameInput.disabled = false; // Убираем disabled атрибут
        }
        
        settingsForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Получаем значения из формы
            const displayNameInput = this.querySelector('input[name="display-name"]');
            const emailInput = this.querySelector('input[name="email"]');
            const locationInput = this.querySelector('input[name="location"]');
            const submitButton = this.querySelector('button[type="submit"]');
            
            // Проверяем наличие полей
            if (!displayNameInput || !emailInput || !locationInput) {
                console.error('Missing form fields');
                return;
            }
            
            // Собираем интересы
            const interestTags = document.querySelectorAll('.interest-tag');
            const interests = [];
            interestTags.forEach(tag => {
                const text = tag.textContent.replace('×', '').trim();
                if (text) interests.push(text);
            });
            
            // Формируем данные профиля
            const profileData = {
                username: displayNameInput.value.trim(),
                email: emailInput.value.trim(),
                location: locationInput.value.trim(),
                interests: interests
            };
            
            // Блокируем кнопку на время операции
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Saving...';
            }
            
            try {
                // Обновляем профиль
                await apiService.updateProfile(profileData);
                
                // Обновляем локальные данные пользователя
                const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
                userData.username = profileData.username;
                userData.email = profileData.email;
                userData.location = profileData.location;
                userData.interests = profileData.interests;
                localStorage.setItem('user_data', JSON.stringify(userData));
                
                // Показываем уведомление об успехе
                showNotification('Profile settings saved', 'success');
                
                // Перенаправляем на страницу профиля
                setTimeout(() => {
                    if (window.router) {
                        window.router.navigate('/profile');
                    }
                }, 1500);
            } catch (error) {
                // Показываем уведомление об ошибке
                showNotification(error.message || 'Error saving settings', 'error');
            } finally {
                // Восстанавливаем состояние кнопки
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Save Changes';
                }
            }
        });
        
        // Добавление новых интересов
        const addInterestBtn = document.getElementById('add-interest-btn');
        const newInterestInput = document.getElementById('new-interest');
        const interestsContainer = document.getElementById('interests-container');
        
        if (addInterestBtn && newInterestInput && interestsContainer) {
            addInterestBtn.addEventListener('click', function() {
                const interestText = newInterestInput.value.trim();
                if (interestText) {
                    const interestTag = document.createElement('span');
                    interestTag.classList.add('interest-tag');
                    interestTag.innerHTML = `${interestText} <button type="button" class="remove-interest" data-interest="${interestText}">&times;</button>`;
                    interestsContainer.appendChild(interestTag);
                    newInterestInput.value = '';
                    
                    // Добавляем обработчик для кнопки удаления
                    const removeBtn = interestTag.querySelector('.remove-interest');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', function() {
                            interestTag.remove();
                        });
                    }
                }
            });
            
            // Добавление по нажатию Enter
            newInterestInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addInterestBtn.click();
                }
            });
        }
        
        // Обработчики для существующих кнопок удаления интересов
        document.querySelectorAll('.remove-interest').forEach(btn => {
            btn.addEventListener('click', function() {
                const tag = this.closest('.interest-tag');
                if (tag) tag.remove();
            });
        });
        
        // Обработчик для кнопки отмены
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                if (window.router) {
                    window.router.navigate('/profile');
                }
            });
        }
    }
}

// Добавляем функцию в глобальный объект для доступа из HTML
window.initSettingsPage = initSettingsPage;

// Инициализация и обработчики для страницы создания мероприятия
function initCreateEventPage() {
    console.log('Initializing create event page');
    
    const createEventForm = document.getElementById('create-event-form');
    const cancelEventBtn = document.getElementById('cancel-event-btn');
    
    if (createEventForm) {
        createEventForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Получаем значения из формы
            const titleInput = document.getElementById('event-title');
            const descriptionInput = document.getElementById('event-description');
            const locationInput = document.getElementById('event-location');
            const dateInput = document.getElementById('event-date');
            const maxParticipantsInput = document.getElementById('event-max-participants');
            const imageInput = document.getElementById('event-image');
            const submitButton = document.querySelector('button[type="submit"]');
            
            // Проверяем обязательные поля
            if (!titleInput.value.trim() || !descriptionInput.value.trim() || 
                !locationInput.value.trim() || !dateInput.value) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }
            
            // Блокируем кнопку на время операции
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Creating...';
            }
            
            try {
                // Формируем данные мероприятия
                const eventData = {
                    title: titleInput.value.trim(),
                    description: descriptionInput.value.trim(),
                    location: locationInput.value.trim(),
                    event_date: dateInput.value,
                    max_participants: maxParticipantsInput.value ? parseInt(maxParticipantsInput.value) : null
                };
                
                // Создаем мероприятие
                const createdEvent = await apiService.createEvent(eventData);
                
                // Если есть изображение, загружаем его
                if (imageInput.files && imageInput.files[0]) {
                    await apiService.uploadEventImage(createdEvent.id, imageInput.files[0]);
                }
                
                // Показываем уведомление об успехе
                showNotification('Event created successfully', 'success');
                
                // Перенаправляем на страницу мероприятия
                setTimeout(() => {
                    if (window.router) {
                        window.router.navigate(`/events/${createdEvent.id}`);
                    } else {
                        window.location.href = `/events/${createdEvent.id}`;
                    }
                }, 1500);
            } catch (error) {
                // Показываем уведомление об ошибке
                showNotification(error.message || 'Error creating event', 'error');
            } finally {
                // Восстанавливаем состояние кнопки
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Create Event';
                }
            }
        });
    }
    
    if (cancelEventBtn) {
        cancelEventBtn.addEventListener('click', function() {
            if (window.router) {
                window.router.navigate('/events');
            } else {
                window.location.href = '/events';
            }
        });
    }
}

// Инициализация страницы списка мероприятий
function initEventsPage() {
    console.log('Initializing events page');
    
    const eventsContainer = document.getElementById('events-container');
    const paginationContainer = document.getElementById('events-pagination');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // Параметры пагинации
    let currentPage = 1;
    const itemsPerPage = 12;
    let currentFilter = 'all';
    
    // Функция загрузки мероприятий
    async function loadEvents() {
        if (!eventsContainer) return;
        
        // Показываем индикатор загрузки
        eventsContainer.innerHTML = '<div class="loading-spinner">Loading events...</div>';
        
        try {
            // Определяем параметры запроса
            const skip = (currentPage - 1) * itemsPerPage;
            const filterType = currentFilter === 'all' ? null : currentFilter;
            
            // Загружаем мероприятия
            const events = await apiService.getEvents({
                skip: skip,
                limit: itemsPerPage,
                filter: filterType
            });
            
            // Если мероприятий нет
            if (events.length === 0) {
                eventsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>No events found</p>
                        <a href="/create-event" class="btn btn-primary">Create New Event</a>
                    </div>
                `;
                paginationContainer.innerHTML = '';
                return;
            }
            
            // Отображаем мероприятия
            eventsContainer.innerHTML = '';
            events.forEach(event => {
                // Форматируем дату
                const eventDate = new Date(event.event_date);
                const formattedDate = eventDate.toLocaleDateString() + ' ' + 
                                      eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                // Создаем карточку мероприятия
                const eventCard = document.createElement('div');
                eventCard.className = 'event-card';
                eventCard.innerHTML = `
                    <div class="event-image" style="background-image: url('${event.image_url || '/static/icon/event.jpeg'}')"></div>
                    <div class="event-details">
                        <h3 class="event-title">${event.title}</h3>
                        <p class="event-location"><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
                        <p class="event-date"><i class="fas fa-calendar"></i> ${formattedDate}</p>
                        <div class="event-participants">
                            <i class="fas fa-users"></i> ${event.participants.length} participant(s)
                            ${event.max_participants ? `/ ${event.max_participants}` : ''}
                        </div>
                        <a href="/events/${event.id}" class="btn btn-secondary view-event-btn">View Details</a>
                    </div>
                `;
                
                eventsContainer.appendChild(eventCard);
            });
            
            // Обновляем пагинацию
            paginationContainer.innerHTML = `
                <button class="pagination-btn prev" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
                <span class="current-page">Page ${currentPage}</span>
                <button class="pagination-btn next" ${events.length < itemsPerPage ? 'disabled' : ''}>Next</button>
            `;
            
            // Добавляем обработчики для кнопок пагинации
            const prevBtn = paginationContainer.querySelector('.prev');
            const nextBtn = paginationContainer.querySelector('.next');
            
            if (prevBtn) {
                prevBtn.addEventListener('click', function() {
                    if (currentPage > 1) {
                        currentPage--;
                        loadEvents();
                    }
                });
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', function() {
                    if (events.length === itemsPerPage) {
                        currentPage++;
                        loadEvents();
                    }
                });
            }
        } catch (error) {
            console.error('Error loading events:', error);
            eventsContainer.innerHTML = `
                <div class="error-message">
                    Error loading events: ${error.message || 'Unknown error'}
                </div>
            `;
        }
    }
    
    // Инициализация фильтров
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Удаляем активный класс у всех кнопок
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Добавляем активный класс текущей кнопке
                this.classList.add('active');
                
                // Обновляем текущий фильтр
                currentFilter = this.getAttribute('data-filter');
                currentPage = 1;
                
                // Загружаем мероприятия с новым фильтром
                loadEvents();
            });
        });
    }
    
    // Загружаем мероприятия при инициализации
    loadEvents();
}

// Инициализация детальной страницы мероприятия
function initEventDetailsPage() {
    console.log('Initializing event details page');
    
    const eventDetailsSection = document.querySelector('.event-details-section');
    
    if (!eventDetailsSection) return;
    
    const eventId = eventDetailsSection.getAttribute('data-event-id');
    
    if (!eventId) {
        eventDetailsSection.innerHTML = '<div class="error-message">Event ID not provided</div>';
        return;
    }
    
    // Функция загрузки деталей мероприятия
    async function loadEventDetails() {
        try {
            // Загружаем мероприятие
            const event = await apiService.getEvent(eventId);
            
            // Форматируем дату
            const eventDate = new Date(event.event_date);
            const formattedDate = eventDate.toLocaleDateString() + ' ' + 
                                  eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Проверяем, участвует ли текущий пользователь
            const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
            const isParticipant = userData.id && event.participants.includes(userData.id);
            const isCreator = userData.id && event.created_by === userData.id;
            
            // Отображаем детали мероприятия
            eventDetailsSection.innerHTML = `
                <div class="event-header">
                    <div class="event-cover" style="background-image: url('${event.image_url || '/static/icon/event.jpeg'}')">
                        ${isCreator ? `
                            <button class="edit-event-btn btn btn-primary">
                                <i class="fas fa-edit"></i> Edit Event
                            </button>
                            <button class="delete-event-btn btn btn-danger">
                                <i class="fas fa-trash"></i> Delete Event
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <div class="event-content">
                    <h1 class="event-title">${event.title}</h1>
                    
                    <div class="event-meta">
                        <div class="meta-item">
                            <i class="fas fa-map-marker-alt"></i> 
                            <span>${event.location}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i> 
                            <span>${formattedDate}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-users"></i> 
                            <span>${event.participants.length} participant(s) ${event.max_participants ? `/ ${event.max_participants}` : ''}</span>
                        </div>
                    </div>
                    
                    <div class="event-description">
                        <h3>Description</h3>
                        <p>${event.description}</p>
                    </div>
                    
                    <div class="event-actions">
                        ${!isCreator && !isParticipant ? `
                            <button class="join-event-btn btn btn-primary">Join Event</button>
                        ` : ''}
                        
                        ${!isCreator && isParticipant ? `
                            <button class="leave-event-btn btn btn-danger">Leave Event</button>
                        ` : ''}
                        
                        <a href="/events" class="btn btn-secondary">Back to All Events</a>
                    </div>
                </div>
            `;
            
            // Добавляем обработчики для кнопок
            if (isCreator) {
                // Обработчик для кнопки редактирования
                const editBtn = eventDetailsSection.querySelector('.edit-event-btn');
                if (editBtn) {
                    editBtn.addEventListener('click', function() {
                        // Переходим на страницу редактирования
                        if (window.router) {
                            window.router.navigate(`/edit-event/${eventId}`);
                        } else {
                            window.location.href = `/edit-event/${eventId}`;
                        }
                    });
                }
                
                // Обработчик для кнопки удаления
                const deleteBtn = eventDetailsSection.querySelector('.delete-event-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', async function() {
                        if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                            try {
                                await apiService.deleteEvent(eventId);
                                showNotification('Event deleted successfully', 'success');
                                
                                setTimeout(() => {
                                    if (window.router) {
                                        window.router.navigate('/events');
                                    } else {
                                        window.location.href = '/events';
                                    }
                                }, 1500);
                            } catch (error) {
                                showNotification(error.message || 'Error deleting event', 'error');
                            }
                        }
                    });
                }
            } else {
                // Обработчик для кнопки присоединения к мероприятию
                const joinBtn = eventDetailsSection.querySelector('.join-event-btn');
                if (joinBtn) {
                    joinBtn.addEventListener('click', async function() {
                        try {
                            await apiService.joinEvent(eventId);
                            showNotification('Successfully joined the event', 'success');
                            
                            // Перезагружаем страницу для обновления статуса участия
                            setTimeout(() => {
                                loadEventDetails();
                            }, 1500);
                        } catch (error) {
                            showNotification(error.message || 'Error joining event', 'error');
                        }
                    });
                }
                
                // Обработчик для кнопки выхода из мероприятия
                const leaveBtn = eventDetailsSection.querySelector('.leave-event-btn');
                if (leaveBtn) {
                    leaveBtn.addEventListener('click', async function() {
                        if (confirm('Are you sure you want to leave this event?')) {
                            try {
                                await apiService.leaveEvent(eventId);
                                showNotification('Successfully left the event', 'success');
                                
                                // Перезагружаем страницу для обновления статуса участия
                                setTimeout(() => {
                                    loadEventDetails();
                                }, 1500);
                            } catch (error) {
                                showNotification(error.message || 'Error leaving event', 'error');
                            }
                        }
                    });
                }
            }
            
        } catch (error) {
            console.error('Error loading event details:', error);
            eventDetailsSection.innerHTML = `
                <div class="error-message">
                    Error loading event details: ${error.message || 'Unknown error'}
                </div>
                <a href="/events" class="btn btn-secondary">Back to All Events</a>
            `;
        }
    }
    
    // Загружаем детали мероприятия при инициализации
    loadEventDetails();
}

// Инициализация страницы редактирования мероприятия
function initEditEventPage() {
    console.log('Initializing edit event page');
    
    const editEventForm = document.getElementById('edit-event-form');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    
    if (!editEventForm) return;
    
    const eventId = editEventForm.getAttribute('data-event-id');
    
    if (!eventId) {
        showNotification('Event ID not provided', 'error');
        return;
    }
    
    // Обработчик отправки формы
    editEventForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Получаем значения из формы
        const titleInput = document.getElementById('event-title');
        const descriptionInput = document.getElementById('event-description');
        const locationInput = document.getElementById('event-location');
        const dateInput = document.getElementById('event-date');
        const maxParticipantsInput = document.getElementById('event-max-participants');
        const imageInput = document.getElementById('event-image');
        const submitButton = document.querySelector('button[type="submit"]');
        
        // Проверяем обязательные поля
        if (!titleInput.value.trim() || !descriptionInput.value.trim() || 
            !locationInput.value.trim() || !dateInput.value) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Блокируем кнопку на время операции
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
        }
        
        try {
            // Формируем данные для обновления
            const eventData = {
                title: titleInput.value.trim(),
                description: descriptionInput.value.trim(),
                location: locationInput.value.trim(),
                event_date: dateInput.value,
                max_participants: maxParticipantsInput.value ? parseInt(maxParticipantsInput.value) : null
            };
            
            // Обновляем мероприятие
            await apiService.updateEvent(eventId, eventData);
            
            // Если выбрано новое изображение, загружаем его
            if (imageInput.files && imageInput.files[0]) {
                await apiService.uploadEventImage(eventId, imageInput.files[0]);
            }
            
            // Показываем уведомление об успехе
            showNotification('Event updated successfully', 'success');
            
            // Перенаправляем на страницу мероприятия
            setTimeout(() => {
                if (window.router) {
                    window.router.navigate(`/events/${eventId}`);
                } else {
                    window.location.href = `/events/${eventId}`;
                }
            }, 1500);
        } catch (error) {
            // Показываем уведомление об ошибке
            showNotification(error.message || 'Error updating event', 'error');
        } finally {
            // Восстанавливаем состояние кнопки
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Save Changes';
            }
        }
    });
    
    // Обработчик кнопки отмены
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', function() {
            if (window.router) {
                window.router.navigate(`/events/${eventId}`);
            } else {
                window.location.href = `/events/${eventId}`;
            }
        });
    }
}
