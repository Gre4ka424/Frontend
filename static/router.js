// Simple client-side router
import apiService from '/src/services/api.service.js';
import { showNotification } from '/src/utils/notification.utils.js';
import { generateColorFromString, updateUIForAuthenticatedUser } from '/src/utils/user.utils.js';
import { formatDate } from '/src/utils/format.utils.js';

// Функция для скрытия тулбара при навигации
function hideToolbars() {
    // Находим и скрываем все тулбары
    const toolbars = document.querySelectorAll('.toolbar, .developer-toolbar');
    toolbars.forEach(toolbar => {
        if (toolbar) {
            toolbar.style.display = 'none';
        }
    });
}

// Локальная функция для получения профиля пользователя, чтобы избежать циклической зависимости
async function fetchUserProfileForRouter() {
  try {
    // Получаем профиль через API сервис
    const profileData = await apiService.fetchProfile();
    
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
      onboardingCompleted: profileData.onboarding_completed || false
    };
    
    // Получаем дополнительные данные пользователя через API сервис
    try {
      const userDetailsData = await apiService.getUserDetails();
      
      userData.id = userDetailsData.id;
      userData.username = userDetailsData.username;
      userData.email = userDetailsData.email;
      
      // Обрабатываем дату с проверкой формата
      let joinDate;
      if (userDetailsData.created_at) {
        try {
          joinDate = new Date(userDetailsData.created_at);
          if (isNaN(joinDate.getTime())) {
            joinDate = new Date();
          }
        } catch (e) {
          joinDate = new Date();
        }
      } else {
        joinDate = new Date();
      }
      userData.joinDate = formatDate(joinDate);
      
      userData.isAdmin = userDetailsData.is_admin || false;
    } catch (error) {
      console.error('Error fetching user details:', error);
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

class Router {
    constructor() {
        this.routes = new Map();
        this.cache = new Map();
        this.isTransitioning = false;
        this.dynamicRoutes = new Map();
        this.currentPath = '';
        
        // Инициализация при загрузке страницы
        window.addEventListener('DOMContentLoaded', () => {
            this.setupNavigation();
            this.handleRoute();
            this.preloadComponents();
        });

        // Обработка навигации браузера
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Обработчик хэш-изменений
        window.addEventListener('hashchange', () => this.handleHashChange());
    }

    // Проверка авторизации пользователя
    checkAuthentication(redirectPath = '/login') {
        const authToken = localStorage.getItem('auth_token');
        if (!authToken) {
            setTimeout(() => {
                if (window.router) {
                    window.router.navigate(redirectPath);
                }
            }, 10);
            return false;
        }
        return true;
    }

    setupNavigation() {
        // Обработка кликов по ссылкам
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href.startsWith(window.location.origin)) {
                e.preventDefault();
                const path = link.getAttribute('href');
                this.navigate(path);
            }
        });
    }

    // Регистрация маршрута
    register(path, component) {
        if (path.includes(':')) {
            // Динамический маршрут
            const pattern = path.replace(/:(\w+)/g, '([^/]+)');
            const regex = new RegExp(`^${pattern}$`);
            const paramNames = [...path.matchAll(/:(\w+)/g)].map(match => match[1]);
            this.dynamicRoutes.set(regex, { component, paramNames });
        } else {
            // Статический маршрут
            this.routes.set(path, component);
        }
    }

    // Обработка изменения хэша
    handleHashChange() {
        const hash = window.location.hash.slice(1);
        if (hash) {
            this.navigate('/' + hash);
        }
    }

    // Навигация к указанному пути
    navigate(path) {
        if (this.isTransitioning) return;
        
        // Скрываем тулбары при навигации
        hideToolbars();
        
        // Если переходим со страницы профиля, удаляем класс profile-page
        if (this.currentPath === '/profile') {
            document.body.classList.remove('profile-page');
        }
        
        const url = new URL(path, window.location.origin);
        history.pushState({}, '', url.pathname);
        this.handleRoute();
    }

    // Обработка маршрута
    async handleRoute() {
        const path = window.location.pathname || '/';
        const routeMatch = this.findMatchingRoute(path);
        this.currentPath = path;
        
        // Обновляем активную ссылку в навигации
        this.updateActiveNavLink();

        if (!routeMatch) {
            console.error('Route not found:', path);
            this.showError('Страница не найдена');
            return;
        }

        try {
            this.isTransitioning = true;
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.classList.add('fade-out');

                await new Promise(resolve => setTimeout(resolve, 300));

                const { component, params } = routeMatch;
                const content = await this.loadComponent(component, params);
                
                mainContent.innerHTML = content;
                mainContent.classList.remove('fade-out');
                mainContent.classList.add('fade-in');
                
                setTimeout(() => {
                    mainContent.classList.remove('fade-in');
                    this.isTransitioning = false;
                }, 300);
            }
        } catch (error) {
            console.error('Ошибка маршрутизации:', error);
            this.showError('Ошибка при загрузке страницы');
        }
    }

    // Поиск соответствующего компонента для маршрута
    findMatchingRoute(path) {
        // Сначала проверяем статические маршруты
        if (this.routes.has(path)) {
            return { 
                component: this.routes.get(path),
                params: {}
            };
        }

        // Затем проверяем динамические маршруты
        for (const [regex, { component, paramNames }] of this.dynamicRoutes) {
            const match = path.match(regex);
            if (match) {
                const params = {};
                paramNames.forEach((name, index) => {
                    params[name] = match[index + 1];
                });
                return { component, params };
            }
        }

        return null;
    }

    // Отображение ошибки
    showError(message) {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="error-message">
                    <h2>Ошибка</h2>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    async preloadComponents() {
        // Предзагрузка компонентов в фоновом режиме
        this.routes.forEach((component, path) => {
            if (path !== this.currentPath) {
                this.loadComponent(component, {}).catch(console.error);
            }
        });
    }

    async loadComponent(component, params) {
        if (this.cache.has(component)) {
            return this.cache.get(component);
        }

        try {
            const content = await component(params);
            this.cache.set(component, content);
            return content;
        } catch (error) {
            console.error('Error preloading component:', error);
            throw error;
        }
    }
    
    // Обновление активной ссылки в навигации
    updateActiveNavLink() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === this.currentPath) {
                link.classList.add('active');
            }
        });
    }
}

// Define route handlers
const routes = {
    '/': async () => {
    return `
        <section class="hero-banner">
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <h1>We connect here, we meet everywhere.</h1>
                <p>Welcome to MeetHere, our social site that connects you with other people and helps you to make new friends.</p>
                <div class="cta-buttons">
                    <a href="/login" class="btn btn-light">Login</a>
                    <a href="/register" class="btn btn-light">User registration</a>
                </div>
            </div>
        </section>
        <section class="features-section">
            <div class="features-content">
                <h2 class="features-title">"Connect Locally, Meet Globally"</h2>
                <p class="features-description">MeetHere is an innovative social networking platform that allows you to connect with other users</p>
                <div class="features-list">
                    <div class="feature-item">
                        <span class="feature-icon">•</span>
                        <p>Event planning and promotion</p>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">•</span>
                        <p>Community engagement management</p>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">•</span>
                        <p>Social media analytics tracking</p>
                    </div>
                </div>
                <a href="/services" class="features-link">All services →</a>
            </div>
            <div class="features-image">
                <img src="/static/icon/event.jpeg" alt="Event Photo">
            </div>
        </section>
        <footer class="footer">
            <button class="footer-btn">Contact us</button>
        </footer>
    `;
},
    '/services': async () => {
        return `
            <div class="page-header dark-bg">
                <h1 class="section-title accent">"Connect Locally, Meet Globally"</h1>
                <p class="section-description">MeetHere is an innovative social networking platform that allows you to connect with other users who share the same interests</p>
            </div>

            <div class="services-grid">
                <div class="service-item">
                    <div class="service-image">
                        <img src="/static/icon/images1.jpeg" alt="Event planning">
                    </div>
                    <div class="service-details">
                        <h2 class="service-title accent">Event planning and promotion</h2>
                        <p class="service-description">The organization and promotion of an event requires constant monitoring of trends and creativity to create memorable experiences.</p>
                    </div>
                </div>

                <div class="service-item">
                    <div class="service-image">
                        <img src="/static/icon/images2.jpeg" alt="Community engagement">
                    </div>
                    <div class="service-details">
                        <h2 class="service-title accent">Community engagement management</h2>
                        <p class="service-description">Community engagement management is an important tool for maintaining and strengthening relationships with the public.</p>
                    </div>
                </div>

                <div class="service-item">
                    <div class="service-image">
                        <img src="/static/icon/images3.jpeg" alt="Social media analytics">
                    </div>
                    <div class="service-details">
                        <h2 class="service-title accent">Social media analytics tracking</h2>
                        <p class="service-description">Social media analytics tracking is an essential tool for any business that wants to analyze its presence in social networks.</p>
                    </div>
                </div>
            </div>
        `;
    },
    '/our-work': async () => {
        return `
            <div class="page-header dark-bg">
                <h1 class="section-title accent">Our Latest Projects</h1>
                <p class="section-description">Explore our successful events and gatherings that brought people together</p>
            </div>

            <div class="portfolio-grid">
                <div class="portfolio-item">
                    <div class="portfolio-image">
                        <img src="/static/icon/images1.jpeg" alt="Project 1">
                    </div>
                    <div class="portfolio-details">
                        <h3>International Tech Meetup</h3>
                        <p>A global gathering of tech enthusiasts sharing knowledge and experiences</p>
                        <div class="portfolio-meta">
                            <span>Date: June 2023</span>
                            <span>Participants: 500+</span>
                        </div>
                    </div>
                </div>

                <div class="portfolio-item">
                    <div class="portfolio-image">
                        <img src="/static/icon/images4.jpeg" alt="Project 2">
                    </div>
                    <div class="portfolio-details">
                        <h3>Cultural Exchange Festival</h3>
                        <p>Celebrating diversity through art, music, and traditional performances</p>
                        <div class="portfolio-meta">
                            <span>Date: August 2023</span>
                            <span>Participants: 1000+</span>
                        </div>
                    </div>
                </div>

                <div class="portfolio-item">
                    <div class="portfolio-image">
                        <img src="/static/icon/images5.jpeg" alt="Project 3">
                    </div>
                    <div class="portfolio-details">
                        <h3>Startup Networking Event</h3>
                        <p>Connecting entrepreneurs and investors in an innovative environment</p>
                        <div class="portfolio-meta">
                            <span>Date: September 2023</span>
                            <span>Participants: 300+</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    '/our-team': async () => {
        return `
            <div class="page-header dark-bg">
                <h1 class="section-title accent">Meet Our Team</h1>
                <p class="section-description">The passionate professionals behind MeetHere's success</p>
            </div>

            <div class="team-grid">
                <div class="team-member">
                    <img src="/static/icon/Filippos.jpeg" alt="Filippos Koumoundouros">
                    <h3>Filippos Koumoundouros</h3>
                    <p>Database Engineer, QA Engineer, Security Specialist</p>
                    <p>MeetHere</p>
                </div>
                <div class="team-member">
                    <img src="/static/icon/Denis.jpeg" alt="Denis Gubochkin">
                    <h3>Denis Gubochkin</h3>
                    <p>Frontend developer, Backend Developer, UI/UX Designer, Interaction Designer, Project manager</p>
                    <p>MeetHere</p>
                </div>
            </div>
        `;
    },
    '/price-list': async () => {
        return `
            <section id="price-list" class="price-list-section">
                <div class="page-header dark-bg">
                    <h1 class="section-title green-text">Our Pricing Plans</h1>
                    <p class="section-description">Choose the perfect plan for your networking needs</p>
                </div>

                <div class="price-list-content">
                    <h2 class="price-list-title green-text">Price list</h2>
                    <p class="price-list-description">MeetHere's price list offers flexible options for its users. There are three different syndication options</p>
                    
                    <div class="premium-info">
                        <p>Premium Membership: includes access to personalised features and capabilities on MeetHere, such as suggested meetings and other features.</p>
                    </div>
                    
                    <div class="price-table">
                        <div class="price-row">
                            <div class="price-service">Create a user account</div>
                            <div class="price-value">Free</div>
                        </div>
                        <div class="price-row">
                            <div class="price-service">Add photos and videos</div>
                            <div class="price-value">Free</div>
                        </div>
                        <div class="price-row">
                            <div class="price-service">User profile creation</div>
                            <div class="price-value">Free</div>
                        </div>
                        <div class="price-row">
                            <div class="price-service">Search</div>
                            <div class="price-value">Free</div>
                        </div>
                        <div class="price-row">
                            <div class="price-service">Create new events</div>
                            <div class="price-value">5€</div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    },
    '/contact': async () => {
        return `
            <section id="contact" class="contact-section light-bg">
                <h1 class="section-title green-text">Contact</h1>
                
                <div class="contact-info-container">
                    <div class="contact-info-column">
                        <div class="contact-info-block">
                            <div class="contact-icon">
                                <img src="/static/icon/envelope.svg" alt="Message">
                            </div>
                            <h3 class="contact-title green-text">Message us</h3>
                            <p class="contact-label">Send message</p>
                            <p class="contact-detail">fili.koumoundouros@mc-class.gr</p>
                            <p class="contact-detail">den.gubochkin@mc-class.gr</p>
                        </div>
                    </div>
                    
                    <div class="contact-info-column">
                        <div class="contact-info-block">
                            <div class="contact-icon">
                                <img src="/static/icon/phone.svg" alt="Phone">
                            </div>
                            <h3 class="contact-title green-text">Call us</h3>
                            <p class="contact-label">Contact us</p>
                            <p class="contact-detail">6989800026</p>
                            <p class="contact-detail">6937956407</p>
                        </div>
                    </div>
                    
                    <div class="contact-info-column">
                        <div class="contact-info-block">
                            <div class="contact-icon">
                                <img src="/static/icon/map-pin.svg" alt="Address">
                            </div>
                            <h3 class="contact-title green-text">Find us</h3>
                            <p class="contact-label">Address</p>
                            <p class="contact-detail">Achilleos 33a, Glyfada 166 75</p>
                        </div>
                    </div>
                </div>
                
                <div class="contact-row">
                    <div class="map-container">
                        <!-- Обновленная ссылка для карты с точным адресом -->
                        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3147.6748171964747!2d23.754695715441212!3d37.876550279748546!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14a1bf8163fe99a3%3A0x45703456debbc8f5!2sMediterranean%20College%20%CE%93%CE%BB%CF%85%CF%86%CE%AC%CE%B4%CE%B1%CF%82!5e0!3m2!1sen!2sgr!4v1714322683991!5m2!1sen!2sgr" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                    </div>
                    
                    <div class="contact-form-container">
                        <div class="form-header">
                            <h2 class="green-text">EVERYTHING YOU NEED FOR YOUR CAMERA</h2>
                            <p>Welcome to MeetHere, the new social network that connects people!!</p>
                        </div>
                        
                        <form class="contact-form">
                            <div class="form-group">
                                <label for="name">Full name</label>
                                <input type="text" id="name" placeholder="Full name" required>
                            </div>
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input type="email" id="email" placeholder="@" required>
                            </div>
                            <div class="form-group">
                                <label for="message">Μήνυμα</label>
                                <textarea id="message" placeholder="Μήνυμα" required></textarea>
                            </div>
                            <button type="submit" class="submit-btn">Submission</button>
                        </form>
                    </div>
                </div>
            </section>
        `;
    },
    '/login': async () => {
        return `
            <section class="auth-section">
                <h1>Login</h1>
                <form class="auth-form" id="login-form">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Login</button>
                </form>
                <p class="auth-links">
                    Don't have an account? <a href="/register">Register here</a>
                </p>
            </section>
        `;
    },
    '/register': async () => {
        return `
            <section class="auth-section">
                <h1>Registration</h1>
                <form id="register-form" class="auth-form">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Register</button>
                </form>
                <p class="auth-links">
                    Already have an account? <a href="/login">Login here</a>
                </p>
            </section>
        `;
    },
    '/profile': async () => {
        // Проверяем, авторизован ли пользователь
        if (!router.checkAuthentication('/login')) {
            return `<div class="error-message">You need to log in to view profile</div>`;
        }
        
        // Добавляем класс для страницы профиля
        document.body.classList.add('profile-page');
        
        // Всегда обновляем данные пользователя с сервера при переходе на страницу профиля
        let userData;
        try {
            userData = await fetchUserProfileForRouter();
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            // Если произошла ошибка при получении профиля, перенаправляем на логин
            setTimeout(() => {
                if (window.router) {
                    window.router.navigate('/login');
                }
            }, 10);
            return `<div class="error-message">Error loading profile data</div>`;
        }
        
        // Используем имеющиеся данные пользователя
        const username = userData?.username || 'User';
        const email = userData?.email || '';
        const joinDate = userData?.joinDate || 'April 2023';
        const location = userData?.location || 'Athens, GR';
        const interests = userData?.interests || [];
        const groups = userData?.groups || [];
        
        // Генерируем цвет аватара на основе имени пользователя
        const avatarColor = generateColorFromString(username);
        
        // Формируем первую букву имени для аватара
        const avatarLetter = username.charAt(0).toUpperCase();
        
        const profile = `
            <section class="profile-section">
                <div class="profile-header">
                    <div class="profile-cover">
                        <button class="change-photo-btn">
                            <i class="fas fa-camera"></i> Change profile photo
                        </button>
                        
                        <!-- Кнопка настроек с иконкой шестеренки -->
                        <button class="settings-btn" id="profileSettingsBtn">
                            <i class="fas fa-cog"></i>
                        </button>

                        <!-- Выпадающее меню настроек -->
                        <div class="settings-dropdown" id="settingsDropdown" style="display: none;">
                            <ul>
                                <li><a href="#" class="edit-profile-btn">Profile Settings</a></li>
                                <li><a href="#" class="create-event-btn">Create Event</a></li>
                                <li><a href="#" class="logout-btn">Logout</a></li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="profile-info">
                        <div class="profile-avatar" style="background-color: ${userData.profile_photo ? 'transparent' : avatarColor}">
                            ${userData.profile_photo ? 
                                `<img src="${userData.profile_photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : 
                                avatarLetter}
                        </div>
                        <h1 class="profile-username">${username}</h1>
                        <p class="profile-email">${email}</p>
                        <div class="profile-meta">
                            <span><i class="fas fa-map-marker-alt"></i> ${location}</span>
                            <span><i class="fas fa-calendar"></i> Joined MeetHere on ${joinDate}</span>
                        </div>
                    </div>
                </div>
                
                <div class="profile-stats">
                    <div class="stat-box">
                        <span class="stat-number">${groups.length}</span>
                        <span class="stat-label">Groups</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">0</span>
                        <span class="stat-label">Events</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-number">${interests.length}</span>
                        <span class="stat-label">Interests</span>
                    </div>
                </div>
                
                <div class="profile-tabs">
                    <div class="tab-header">
                        <button class="tab-btn active" data-tab="about">About</button>
                        <button class="tab-btn" data-tab="events">Events</button>
                        <button class="tab-btn" data-tab="groups">Groups</button>
                    </div>
                    
                    <div class="tab-content active" id="about-tab">
                        <div class="profile-card">
                            <h3>Interests</h3>
                            <div class="interests-list">
                                ${interests.length > 0 
                                    ? interests.map(interest => `<span class="interest-tag">${interest}</span>`).join('') 
                                    : '<p class="empty-state">No interests added yet</p>'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="events-tab">
                        <div class="profile-card">
                            <h3>Your Events</h3>
                            <p class="empty-state">You haven't joined any events yet.</p>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="groups-tab">
                        <div class="profile-card">
                            <h3>Your Groups</h3>
                            ${groups.length > 0 
                                ? `<div class="groups-list">
                                    ${groups.map(group => `
                                        <div class="group-item">
                                            <div class="group-avatar" style="background-color: ${generateColorFromString(group)}">
                                                ${group.charAt(0).toUpperCase()}
                                            </div>
                                            <span class="group-name">${group}</span>
                                        </div>
                                    `).join('')}
                                </div>` 
                                : '<p class="empty-state">You haven\'t joined any groups yet.</p>'}
                        </div>
                    </div>
                </div>
            </section>
        `;
        
        return profile;
    },
    '/settings': async () => {
        // Проверяем, авторизован ли пользователь
        if (!router.checkAuthentication('/login')) {
            return `<div class="error-message">You need to log in to access settings</div>`;
        }
        
        // Получаем данные пользователя из localStorage
        const userData = JSON.parse(localStorage.getItem('user_data')) || {};
        
        return `
            <section class="settings-section">
                <h1>Profile Settings</h1>
                
                <form id="profile-settings-form" class="settings-form">
                    <div class="form-group">
                        <label for="display-name">Username</label>
                        <input type="text" id="display-name" name="display-name" value="${userData.username || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" value="${userData.email || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="location">Location</label>
                        <input type="text" id="location" name="location" value="${userData.location || 'Not specified'}">
                    </div>
                    
                    <div class="form-group">
                        <label>Interests</label>
                        <div class="interests-input">
                            <input type="text" id="new-interest" placeholder="Add interest...">
                            <button type="button" id="add-interest-btn">Add</button>
                        </div>
                        <div class="interests-list" id="interests-container">
                            ${(userData.interests || []).map(interest => 
                                `<span class="interest-tag">${interest} <button type="button" class="remove-interest" data-interest="${interest}">&times;</button></span>`
                            ).join('')}
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
                    </div>
                </form>
            </section>
        `;
    },
    '/create-event': async () => {
        // Проверяем, авторизован ли пользователь
        if (!router.checkAuthentication('/login')) {
            return `<div class="error-message">You must be logged in to create an event</div>`;
        }
        
        return `
            <section class="create-event-section">
                <h1>Create New Event</h1>
                
                <form id="create-event-form" class="event-form">
                    <div class="form-group">
                        <label for="event-title">Title</label>
                        <input type="text" id="event-title" name="title" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="event-description">Description</label>
                        <textarea id="event-description" name="description" rows="5" required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="event-location">Location</label>
                        <input type="text" id="event-location" name="location" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="event-date">Date and Time</label>
                        <input type="datetime-local" id="event-date" name="event_date" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="event-max-participants">Maximum Participants (Optional)</label>
                        <input type="number" id="event-max-participants" name="max_participants" min="1">
                    </div>
                    
                    <div class="form-group">
                        <label for="event-image">Event Image (Optional)</label>
                        <input type="file" id="event-image" name="image" accept="image/*">
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Create Event</button>
                        <button type="button" class="btn btn-secondary" id="cancel-event-btn">Cancel</button>
                    </div>
                </form>
            </section>
        `;
    },
    '/events': async () => {
        return `
            <section class="events-section">
                <h1>Events</h1>
                
                <div class="events-filter">
                    <button class="filter-btn active" data-filter="all">All Events</button>
                    <button class="filter-btn" data-filter="upcoming">Upcoming</button>
                    <button class="filter-btn" data-filter="my">My Events</button>
                    <button class="filter-btn" data-filter="joined">Joined Events</button>
                    <button class="filter-btn" data-filter="past">Past Events</button>
                </div>
                
                <div class="events-grid" id="events-container">
                    <div class="loading-spinner">Loading events...</div>
                </div>
                
                <div class="pagination" id="events-pagination"></div>
            </section>
        `;
    },
    '/events/:id': async (params) => {
        const eventId = params.id;
        
        return `
            <section class="event-details-section" data-event-id="${eventId}">
                <div class="loading-spinner">Loading event details...</div>
            </section>
        `;
    },
    '/edit-event/:id': async (params) => {
        // Проверяем авторизацию
        if (!router.checkAuthentication('/login')) {
            return `<div class="error-message">You must be logged in to edit an event</div>`;
        }
        
        const eventId = params.id;
        
        try {
            // Загружаем мероприятие
            const event = await apiService.getEvent(eventId);
            
            // Проверяем права на редактирование
            const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
            if (event.created_by !== userData.id) {
                return `
                    <div class="error-message">
                        You do not have permission to edit this event
                    </div>
                    <a href="/events/${eventId}" class="btn btn-secondary">Back to Event</a>
                `;
            }
            
            // Форматируем дату для input type="datetime-local"
            const eventDate = new Date(event.event_date);
            const formattedDate = eventDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
            
            return `
                <section class="edit-event-section">
                    <h1>Edit Event</h1>
                    
                    <form id="edit-event-form" class="event-form" data-event-id="${eventId}">
                        <div class="form-group">
                            <label for="event-title">Title</label>
                            <input type="text" id="event-title" name="title" value="${event.title}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="event-description">Description</label>
                            <textarea id="event-description" name="description" rows="5" required>${event.description}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="event-location">Location</label>
                            <input type="text" id="event-location" name="location" value="${event.location}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="event-date">Date and Time</label>
                            <input type="datetime-local" id="event-date" name="event_date" value="${formattedDate}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="event-max-participants">Maximum Participants (Optional)</label>
                            <input type="number" id="event-max-participants" name="max_participants" min="1" value="${event.max_participants || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="event-image">Event Image (Optional)</label>
                            <div class="current-image">
                                ${event.image_url ? `<img src="${event.image_url}" alt="Event image">` : 'No image uploaded'}
                            </div>
                            <input type="file" id="event-image" name="image" accept="image/*">
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                            <button type="button" class="btn btn-secondary" id="cancel-edit-btn">Cancel</button>
                        </div>
                    </form>
                </section>
            `;
        } catch (error) {
            console.error('Error loading event for editing:', error);
            return `
                <div class="error-message">
                    Error loading event: ${error.message || 'Unknown error'}
                </div>
                <a href="/events" class="btn btn-secondary">Back to Events</a>
            `;
        }
    }
};

// Initialize router and register routes
const router = new Router();
Object.entries(routes).forEach(([path, component]) => {
    router.register(path, component);
});

export default router;

function renderSidebar() {
    return `
        <div class="sidebar">
            <div class="logo-container">
                <img src="/static/icon/logo.png" alt="Logo" class="logo">
                <span class="site-name">MeetHere</span>
            </div>
            
            <div class="language-switcher">
                <button class="lang-btn" data-lang="en">EN</button>
                <button class="lang-btn active" data-lang="ru">RU</button>
            </div>
            
            <nav class="sidebar-nav">
                <a href="/" class="nav-link">Home</a>
                <a href="/services" class="nav-link">Services</a>
                <a href="/our-work" class="nav-link">Our Work</a>
                <a href="/our-team" class="nav-link">Our Team</a>
                <a href="/price-list" class="nav-link">Price List</a>
                <a href="/contact" class="nav-link">Contact</a>
                <a href="/events" class="nav-link">Events</a>
            </nav>
        </div>
    `;
}
