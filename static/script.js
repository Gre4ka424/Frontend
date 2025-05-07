// Ожидаем полной загрузки DOM перед выполнением скрипта
document.addEventListener('DOMContentLoaded', function() {
    // Импортируем apiService если он доступен
    let apiService;
    try {
        import('/src/services/api.service.js').then(module => {
            apiService = module.default;
        }).catch(err => {
            console.error('Error importing apiService:', err);
        });
    } catch (error) {
        console.error('Error importing modules:', error);
    }

    // Проверяем наличие модальных окон
    const registerModal = document.getElementById('register-modal');
    const registerBtn = document.querySelector('a[href=\"/register\"]');
    const closeBtn = registerModal ? registerModal.querySelector('.close') : null;
    const registerForm = document.getElementById('register-form');

    // API URL
    const API_URL = 'https://backend-production-c34f.up.railway.app';

    // Обработка модального окна регистрации, если оно есть
    if (registerModal && registerBtn) {
        // Открываем модальное окно при нажатии кнопки "User registration"
        registerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            registerModal.style.display = 'flex';
        });

        // Закрываем модальное окно при нажатии на "×"
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                registerModal.style.display = 'none';
            });
        }

        // Закрываем модальное окно при клике вне его содержимого
        window.addEventListener('click', (e) => {
            if (e.target === registerModal) {
                registerModal.style.display = 'none';
            }
        });
        
        // Закрываем модальное окно при нажатии Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && registerModal.style.display === 'flex') {
                registerModal.style.display = 'none';
            }
        });

        // Обрабатываем отправку формы регистрации, если она есть
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Получаем данные из формы
                const usernameInput = document.getElementById('name');
                const emailInput = document.getElementById('email');
                const passwordInput = document.getElementById('password');
                
                if (!usernameInput || !emailInput || !passwordInput) {
                    alert('Form fields are missing');
                    return;
                }
                
                const username = usernameInput.value.trim();
                const email = emailInput.value.trim();
                const password = passwordInput.value.trim();
                
                // Отправляем данные на API
                try {
                    let response;
                    if (apiService) {
                        // Используем apiService если он доступен
                        await apiService.registerUser(username, email, password);
                        alert('Registration successful!');
                    } else {
                        // Запасной вариант с прямым fetch
                        response = await fetch(`${API_URL}/users/`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                username, // Используем правильное имя поля
                                email,
                                password
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                            // Если регистрация успешна
                            alert('Registration successful!');
                        } else {
                            // Если есть ошибка
                            alert(`Error: ${data.detail || 'Unknown error'}`);
                            return;
                        }
                    }
                    
                    // Закрываем модальное окно и сбрасываем форму
                    registerModal.style.display = 'none';
                    registerForm.reset();
                    
                    // Перенаправляем на страницу логина
                    setTimeout(() => {
                        if (window.router && typeof window.router.navigate === 'function') {
                            window.router.navigate('/login');
                        } else {
                            window.location.href = '/login';
                        }
                    }, 1000);
                    
                } catch (error) {
                    console.error('Error:', error);
                    alert('Server error. Please try again later.');
                }
            });
        }
    }

    // Обработка мобильного меню
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileMenuToggle && sidebar) {
        mobileMenuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            sidebar.classList.toggle('active');
        });
        
        // Закрываем меню при нажатии Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            }
        });
    }
    
    // Плавная прокрутка для якорных ссылок
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        if (!anchor) return;
        
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            
            if (targetId === '#' || !targetId) return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 50,
                    behavior: 'smooth'
                });
                
                // Закрываем мобильное меню при клике на ссылку
                if (mobileMenuToggle && mobileMenuToggle.classList.contains('active')) {
                    mobileMenuToggle.classList.remove('active');
                    sidebar.classList.remove('active');
                }
            }
        });
    });

    // Обработчики для галереи
    const galleryItems = document.querySelectorAll('.gallery-item');
    if (galleryItems && galleryItems.length > 0) {
        galleryItems.forEach(item => {
            if (!item) return;
            
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

    // Обработчик для кнопки Contact Us в футере
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
});
