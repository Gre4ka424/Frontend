/**
 * Сервис для работы с API
 */

import { showNotification } from '../utils/notification.utils.js';

/**
 * Класс для работы с API бэкенда
 */
class ApiService {
  constructor() {
    this.baseUrl = 'https://backend-production-c34f.up.railway.app';
    this.tokenKey = 'auth_token';
    this.tokenTypeKey = 'token_type';
  }

  /**
   * Получает токен авторизации из localStorage
   * @returns {string} Токен авторизации
   */
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Формирует заголовки для запросов с авторизацией
   * @returns {Object} Заголовки запроса
   */
  getAuthHeaders() {
    const token = this.getToken();
    const tokenType = localStorage.getItem(this.tokenTypeKey) || 'bearer';
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `${tokenType.charAt(0).toUpperCase() + tokenType.slice(1)} ${token}` : ''
    };
  }

  /**
   * Авторизация пользователя
   * @param {string} username - Имя пользователя
   * @param {string} password - Пароль
   * @returns {Promise<Object>} Данные авторизации
   */
  async login(username, password) {
    try {
      console.log('Attempting to login with:', { username });
      
      // Изменяем URL с /api/login на /api/token согласно Swagger UI
      const response = await fetch(`${this.baseUrl}/api/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          username,
          password,
          grant_type: 'password'
        })
      });

      if (!response.ok) {
        return this.handleApiError(response);
      }

      const data = await response.json();
      
      if (!data || !data.access_token) {
        console.error('Invalid login response, missing token:', data);
        throw new Error('Ошибка авторизации: не получен токен доступа');
      }
      
      console.log('Login successful, storing token');
      localStorage.setItem(this.tokenKey, data.access_token);
      localStorage.setItem(this.tokenTypeKey, data.token_type || 'bearer');
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      showNotification(error.message || 'Ошибка авторизации', 'error');
      throw error;
    }
  }

  /**
   * Получение профиля пользователя
   * @returns {Promise<Object>} Данные профиля
   */
  async fetchProfile() {
    try {
      const response = await fetch(`${this.baseUrl}/api/profile/`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (response.status === 401) {
        this.handleUnauthorized();
        throw new Error('Сессия истекла');
      }

      if (!response.ok) {
        return this.handleApiError(response);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  }

  /**
   * Обновление профиля пользователя
   * @param {Object} profileData - Данные для обновления
   * @returns {Promise<Object>} Обновленные данные профиля
   */
  async updateProfile(profileData) {
    try {
      // Преобразуем joined_groups из строк в числа, если есть
      const preparedData = { ...profileData };
      
      if (preparedData.joined_groups) {
        preparedData.joined_groups = preparedData.joined_groups.map(group => {
          return typeof group === 'string' ? parseInt(group, 10) : group;
        });
      }
      
      // Проверка валидности данных
      if (preparedData.interests && !Array.isArray(preparedData.interests)) {
        preparedData.interests = preparedData.interests.split(',').map(item => item.trim());
      }
      
      const response = await fetch(`${this.baseUrl}/api/profile/`, {
        method: 'PATCH',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preparedData)
      });
      
      // Подробная обработка ошибок
      if (response.status === 422) {
        const errorData = await response.json();
        console.error('Validation error:', errorData);
        let errorMessage = 'Validation error';
        
        if (errorData.detail && Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(err => 
            `${err.loc.join('.')}: ${err.msg}`
          ).join(', ');
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
        
        throw new Error(errorMessage);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        throw new Error(`Error updating profile: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Обновляем данные в localStorage
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      userData.interests = result.interests;
      userData.location = profileData.location || userData.location;
      localStorage.setItem('user_data', JSON.stringify(userData));
      
      return result;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Обновление данных пользователя (имя, email)
   * @param {Object} userData - Данные пользователя для обновления
   * @returns {Promise<Object>} Обновленные данные пользователя
   */
  async updateUserInfo(userData) {
    try {
        console.log('Updating user info with data:', userData);
        const response = await fetch(`${this.baseUrl}/users/me`, {
            method: 'PATCH',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(userData)
        });
        
        if (response.status === 401) {
            this.handleUnauthorized();
            throw new Error('Сессия истекла');
        }
        
        if (!response.ok) {
            return this.handleApiError(response);
        }
        
        const updatedUser = await response.json();
        console.log('User info successfully updated:', updatedUser);
        return updatedUser;
    } catch (error) {
        console.error('Error updating user info:', error);
        throw error;
    }
  }

  /**
   * Выход из системы
   */
  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.tokenTypeKey);
    localStorage.removeItem('user_data');
    
    showNotification('You have been logged out', 'success');
    
    if (window.router && typeof window.router.navigate === 'function') {
      window.router.navigate('/');
    } else {
      window.location.href = '/';
    }
  }

  /**
   * Обработка ситуации с истекшим токеном
   */
  handleUnauthorized() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.tokenTypeKey);
    localStorage.removeItem('user_data');
    
    showNotification('Session expired. Please login again.', 'error');
    
    setTimeout(() => {
      if (window.router && typeof window.router.navigate === 'function') {
        window.router.navigate('/login');
      } else {
        window.location.href = '/login';
      }
    }, 1500);
  }

  /**
   * Обработка ошибок API
   * @param {Response} response - Ответ от сервера
   * @returns {Promise<Object>} Объект с ошибкой
   */
  async handleApiError(response) {
    let errorMessage = 'Произошла ошибка';
    
    try {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response as JSON:', e);
      }
    } catch (e) {
      console.error('Failed to read error response:', e);
    }
    
    // Специфичная обработка для различных кодов ошибок
    switch (response.status) {
      case 400:
        errorMessage = errorMessage || 'Invalid request';
        break;
      case 401:
        this.handleUnauthorized();
        errorMessage = 'Session expired. Please login again.';
        break;
      case 403:
        errorMessage = 'Access denied';
        break;
      case 404:
        errorMessage = 'Resource not found';
        break;
      case 422:
        errorMessage = 'Validation error';
        break;
      case 500:
        errorMessage = 'Server error';
        break;
    }
    
    throw new Error(errorMessage);
  }

  /**
   * Проверка валидности токена
   * @returns {Promise<boolean>} Результат проверки
   */
  async checkTokenValidity() {
    const token = this.getToken();
    if (!token) {
      console.log('No auth token found');
      return false;
    }
    
    try {
      console.log('Checking token validity via /api/profile/ endpoint');
      const response = await fetch(`${this.baseUrl}/api/profile/`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      console.log('Token check response status:', response.status);
      
      if (response.status === 401) {
        console.log('Token is invalid (401 Unauthorized)');
        this.handleUnauthorized();
        return false;
      }
      
      return response.ok;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  }

  /**
   * Получение детальных данных пользователя
   * @returns {Promise<Object>} Данные пользователя
   */
  async getUserDetails() {
    try {
      // Проверяем наличие токена
      const token = this.getToken();
      if (!token) {
        console.log('No auth token found');
        this.handleUnauthorized();
        throw new Error('Требуется авторизация');
      }

      console.log('Fetching user details from /users/me');
      
      const response = await fetch(`${this.baseUrl}/users/me`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        console.log('Authentication error: 401 Unauthorized');
        this.handleUnauthorized();
        throw new Error('Сессия истекла');
      }
      
      if (!response.ok) {
        console.error('Error fetching user details, status:', response.status);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        
        // Проверяем, является ли ошибка временной
        if (response.status >= 500) {
          throw new Error('Временная ошибка сервера. Пожалуйста, попробуйте позже');
        }
        
        // Для других ошибок возвращаем fallback данные
        return this.getFallbackUserData();
      }

      const userData = await response.json();
      
      // Проверяем обязательные поля
      if (!userData || !userData.username) {
        console.error('Invalid user data received:', userData);
        throw new Error('Получены некорректные данные пользователя');
      }

      console.log('User details fetched successfully:', userData.username);
      
      // Сохраняем данные пользователя в localStorage
      this.saveUserDataToLocalStorage(userData);
      
      return userData;
    } catch (error) {
      console.error('Error fetching user details:', error);
      
      // Если это ошибка авторизации, пробрасываем её дальше
      if (error.message === 'Требуется авторизация' || error.message === 'Сессия истекла') {
        throw error;
      }
      
      // Для других ошибок возвращаем fallback данные
      return this.getFallbackUserData();
    }
  }
  
  /**
   * Получает резервные данные пользователя из localStorage
   * @returns {Object} Данные пользователя
   */
  getFallbackUserData() {
    return {
      id: null,
      username: "Гость",
      email: "",
      created_at: new Date().toISOString(),
      is_admin: false,
      profile_photo: null
    };
  }
  
  /**
   * Сохраняет данные пользователя в localStorage
   * @param {Object} userData - Данные пользователя
   */
  saveUserDataToLocalStorage(userData) {
    try {
      const userDataToSave = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        created_at: userData.created_at,
        is_admin: userData.is_admin,
        profile_photo: userData.profile_photo
      };
      
      localStorage.setItem('user_data', JSON.stringify(userDataToSave));
      console.log('User data saved to localStorage');
    } catch (error) {
      console.error('Error saving user data to localStorage:', error);
    }
  }

  /**
   * Метод для проверки аутентификации пользователя
   * @returns {Promise<boolean>} Результат проверки
   */
  async ensureAuthenticated() {
    const isValid = await this.checkTokenValidity();
    if (!isValid && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      if (window.router && typeof window.router.navigate === 'function') {
        window.router.navigate('/login');
      } else {
        window.location.href = '/login';
      }
      return false;
    }
    return isValid;
  }

  /**
   * Регистрация нового пользователя
   * @param {string} username - Имя пользователя
   * @param {string} email - Email пользователя
   * @param {string} password - Пароль
   * @returns {Promise<Object>} Данные зарегистрированного пользователя
   */
  async registerUser(username, email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      if (!response.ok) {
        return this.handleApiError(response);
      }

      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      showNotification(error.message || 'Ошибка регистрации', 'error');
      throw error;
    }
  }

  /**
   * Загрузка фотографии профиля
   * @param {File} file - Файл изображения
   * @returns {Promise<Object>} Результат загрузки с URL к изображению
   */
  async uploadProfilePhoto(file) {
    try {
      console.log('Uploading profile photo:', file.name, file.type, file.size);
      
      // Проверка, что файл является изображением
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
      }
      
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('photo', file);
      
      console.log('Sending photo to:', `${this.baseUrl}/api/profile/photo`);
      console.log('Auth header:', this.getAuthHeaders().Authorization ? 'Present (token not shown for security)' : 'Missing');
      
      const response = await fetch(`${this.baseUrl}/api/profile/photo`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeaders().Authorization
          // Важно: НЕ устанавливаем Content-Type для FormData
        },
        body: formData
      });
      
      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error response:', errorText);
        throw new Error('Error uploading photo: ' + (errorText || response.statusText));
      }
      
      const result = await response.json();
      console.log('Profile photo uploaded successfully:', result);
      
      if (result.photo_url) {
        // Добавьте базовый URL, если путь относительный
        const fullPhotoUrl = result.photo_url.startsWith('http') 
          ? result.photo_url 
          : `${this.baseUrl}${result.photo_url}`;
        
        console.log('Full photo URL:', fullPhotoUrl);
        
        // Обновляем данные пользователя в localStorage
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        userData.profile_photo = fullPhotoUrl;
        localStorage.setItem('user_data', JSON.stringify(userData));
        
        // Обновляем UI
        this.updateProfilePhotoInUI(fullPhotoUrl);
        
        // Проверка доступности изображения
        this.checkImageAvailability(fullPhotoUrl);
      }
      
      showNotification('Profile photo updated successfully', 'success');
      return result;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      showNotification(error.message || 'Error uploading profile photo', 'error');
      throw error;
    }
  }

  /**
   * Обновление фото профиля в UI
   * @param {string} photoUrl - URL фотографии
   */
  updateProfilePhotoInUI(photoUrl) {
    // Поиск всех возможных элементов аватара на странице
    const avatarElements = document.querySelectorAll('.profile-avatar, .user-avatar');
    
    avatarElements.forEach(avatar => {
      if (avatar) {
        avatar.style.backgroundColor = 'transparent';
        avatar.innerHTML = `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.onerror=null;this.src='/static/icon/user.png';">`;
      }
    });
    
    console.log('Profile photo UI updated with:', photoUrl);
  }

  /**
   * Проверка доступности изображения
   * @param {string} imageUrl - URL изображения
   * @returns {Promise<boolean>} Результат проверки
   */
  async checkImageAvailability(imageUrl) {
    try {
      const imgRequest = await fetch(imageUrl, { method: 'HEAD' });
      console.log('Image availability check:', imageUrl, imgRequest.status);
      return imgRequest.ok;
    } catch (error) {
      console.error('Image availability check failed:', error);
      return false;
    }
  }

  /**
   * Создание нового мероприятия
   * @param {Object} eventData - Данные мероприятия
   * @returns {Promise<Object>} Созданное мероприятие
   */
  async createEvent(eventData) {
    try {
      console.log('Creating event with original data:', eventData);
      
      // Преобразуем данные в правильный формат для API
      const formattedData = {};
      
      // Обязательные поля
      if (!eventData.title || !eventData.description || !eventData.location || !eventData.event_date) {
        throw new Error('Missing required event fields');
      }
      
      formattedData.title = eventData.title;
      formattedData.description = eventData.description;
      formattedData.location = eventData.location;
      
      // Форматирование даты
      try {
        const dateObj = new Date(eventData.event_date);
        if (isNaN(dateObj.getTime())) {
          throw new Error('Invalid date format');
        }
        formattedData.event_date = dateObj.toISOString();
      } catch (e) {
        throw new Error('Invalid event date format');
      }
      
      // Необязательные поля
      if (eventData.max_participants) {
        const maxParticipants = parseInt(eventData.max_participants, 10);
        if (!isNaN(maxParticipants) && maxParticipants > 0) {
          formattedData.max_participants = maxParticipants;
        }
      }
      
      if (eventData.image_url) {
        formattedData.image_url = eventData.image_url;
      }
      
      console.log('Sending formatted event data:', formattedData);
      
      const response = await fetch(`${this.baseUrl}/api/events/`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formattedData)
      });
      
      console.log('Event creation response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `Error creating event (${response.status})`;
        
        try {
          const errorData = await response.json();
          console.error('Event creation error data:', errorData);
          
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              errorMessage = errorData.detail.map(e => e.msg || String(e)).join(', ');
            } else {
              errorMessage = errorData.detail;
            }
          }
        } catch (e) {
          const errorText = await response.text();
          console.error('Event creation error text:', errorText);
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const createdEvent = await response.json();
      console.log('Event created successfully:', createdEvent);
      
      // Обработка загрузки изображения, если оно было предоставлено
      if (eventData.image && typeof eventData.image === 'object' && eventData.image instanceof File) {
        try {
          console.log('Uploading event image...');
          await this.uploadEventImage(createdEvent.id, eventData.image);
        } catch (imageError) {
          console.error('Failed to upload event image:', imageError);
          // Продолжаем выполнение, даже если загрузка изображения не удалась
        }
      }
      
      showNotification('Event created successfully', 'success');
      return createdEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      showNotification(error.message || 'Error creating event', 'error');
      throw error;
    }
  }

  /**
   * Получение списка мероприятий с фильтрацией
   * @param {Object} options - Параметры запроса (skip, limit, filter)
   * @returns {Promise<Array>} Список мероприятий
   */
  async getEvents(options = {}) {
    try {
        // Параметры запроса
        const params = new URLSearchParams();
        if (options.skip) params.append('skip', options.skip);
        if (options.limit) params.append('limit', options.limit);
        if (options.filter) params.append('filter_type', options.filter);
        
        const url = `${this.baseUrl}/api/events/?${params.toString()}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        
        if (response.status === 401) {
            this.handleUnauthorized();
            throw new Error('Session expired');
        }
        
        if (!response.ok) {
            return this.handleApiError(response);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching events:', error);
        throw error;
    }
  }

  /**
   * Получение информации о конкретном мероприятии
   * @param {number} eventId - ID мероприятия
   * @returns {Promise<Object>} Данные мероприятия
   */
  async getEvent(eventId) {
    try {
        const response = await fetch(`${this.baseUrl}/api/events/${eventId}`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        
        if (response.status === 401) {
            this.handleUnauthorized();
            throw new Error('Session expired');
        }
        
        if (!response.ok) {
            return this.handleApiError(response);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching event:', error);
        throw error;
    }
  }

  /**
   * Обновление информации о мероприятии
   * @param {number} eventId - ID мероприятия
   * @param {Object} eventData - Новые данные мероприятия
   * @returns {Promise<Object>} Обновленные данные мероприятия
   */
  async updateEvent(eventId, eventData) {
    try {
        const response = await fetch(`${this.baseUrl}/api/events/${eventId}`, {
            method: 'PATCH',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
        });
        
        if (!response.ok) {
            return this.handleApiError(response);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error updating event:', error);
        throw error;
    }
  }

  /**
   * Удаление мероприятия
   * @param {number} eventId - ID мероприятия
   * @returns {Promise<Object>} Результат удаления
   */
  async deleteEvent(eventId) {
    try {
        const response = await fetch(`${this.baseUrl}/api/events/${eventId}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });
        
        if (!response.ok) {
            return this.handleApiError(response);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
  }

  /**
   * Присоединение к мероприятию
   * @param {number} eventId - ID мероприятия
   * @returns {Promise<Object>} Результат операции
   */
  async joinEvent(eventId) {
    try {
        const response = await fetch(`${this.baseUrl}/api/events/${eventId}/join`, {
            method: 'POST',
            headers: this.getAuthHeaders()
        });
        
        if (!response.ok) {
            return this.handleApiError(response);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error joining event:', error);
        throw error;
    }
  }

  /**
   * Выход из мероприятия
   * @param {number} eventId - ID мероприятия
   * @returns {Promise<Object>} Результат операции
   */
  async leaveEvent(eventId) {
    try {
        const response = await fetch(`${this.baseUrl}/api/events/${eventId}/leave`, {
            method: 'POST',
            headers: this.getAuthHeaders()
        });
        
        if (!response.ok) {
            return this.handleApiError(response);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error leaving event:', error);
        throw error;
    }
  }

  /**
   * Загрузка изображения для мероприятия
   * @param {number} eventId - ID мероприятия
   * @param {File} file - Файл изображения
   * @returns {Promise<Object>} Результат загрузки
   */
  async uploadEventImage(eventId, file) {
    try {
      console.log(`Uploading image for event ${eventId}:`, file.name);
      
      // Проверка, что файл является изображением
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
      }
      
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('file', file);  // Имя поля должно быть 'file' согласно API
      
      const response = await fetch(`${this.baseUrl}/api/events/${eventId}/image`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeaders().Authorization
          // Не устанавливаем Content-Type для FormData
        },
        body: formData
      });
      
      console.log('Event image upload response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Image upload error response:', errorText);
        throw new Error('Failed to upload event image: ' + (errorText || response.statusText));
      }
      
      const result = await response.json();
      console.log('Event image upload success:', result);
      
      return result;
    } catch (error) {
      console.error('Error uploading event image:', error);
      throw error;
    }
  }

  /**
   * Получение полного профиля пользователя
   * @returns {Promise<Object>} Объединенные данные пользователя и профиля
   */
  async fetchUserProfile() {
    try {
      console.log('Fetching user profile data...');
      
      // Сначала получаем базовые данные о пользователе
      let userData = null;
      try {
        const userResponse = await fetch(`${this.baseUrl}/users/me`, {
          method: 'GET',
          headers: this.getAuthHeaders()
        });
        
        console.log('User basic data response status:', userResponse.status);
        
        if (userResponse.ok) {
          userData = await userResponse.json();
          console.log('User basic data:', userData);
        } else {
          console.error('Failed to get user basic data:', userResponse.status);
        }
      } catch (userError) {
        console.error('Error fetching user data:', userError);
      }
      
      // Затем получаем данные профиля
      let profileData = null;
      try {
        const profileResponse = await fetch(`${this.baseUrl}/api/profile/`, {
          method: 'GET',
          headers: this.getAuthHeaders()
        });
        
        console.log('Profile data response status:', profileResponse.status);
        
        if (profileResponse.ok) {
          profileData = await profileResponse.json();
          console.log('Profile data:', profileData);
        } else {
          console.error('Failed to get profile data:', profileResponse.status);
        }
      } catch (profileError) {
        console.error('Error fetching profile data:', profileError);
      }
      
      // Объединяем данные пользователя и профиля
      const combinedData = {
        id: userData?.id,
        username: userData?.username || "User",
        email: userData?.email || "",
        joinDate: userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        interests: profileData?.interests || [],
        joined_groups: profileData?.joined_groups || [],
        location: userData?.location || "Not specified",
        isAdmin: userData?.is_admin || false,
        onboarding_completed: profileData?.onboarding_completed || false,
        profile_photo: profileData?.profile_photo || null,
        birth_date: profileData?.birth_date || null,
        gender: profileData?.gender || null
      };
      
      console.log('Combined user data:', combinedData);
      
      // Сохраняем объединенные данные в localStorage
      localStorage.setItem('user_data', JSON.stringify(combinedData));
      
      // Обновляем UI для авторизованного пользователя
      this.updateUIForUser(combinedData);
      
      return combinedData;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      throw error;
    }
  }

  /**
   * Обновление UI для авторизованного пользователя
   * @param {Object} userData - Данные пользователя
   */
  updateUIForUser(userData) {
    // Обновление аватара
    if (userData.profile_photo) {
      this.updateProfilePhotoInUI(userData.profile_photo);
    } else {
      // Используем первую букву имени пользователя как аватар
      const avatarLetter = (userData.username || 'U').charAt(0).toUpperCase();
      const avatarColor = this.generateColorFromString(userData.username || 'User');
      
      const avatarElements = document.querySelectorAll('.profile-avatar, .user-avatar');
      avatarElements.forEach(avatar => {
        if (avatar) {
          avatar.style.backgroundColor = avatarColor;
          avatar.innerHTML = avatarLetter;
        }
      });
    }
    
    // Обновление имени пользователя
    const usernameElements = document.querySelectorAll('.profile-username, .user-name');
    usernameElements.forEach(element => {
      if (element) {
        element.textContent = userData.username || 'User';
      }
    });
    
    // Обновление других элементов профиля
    // ...
  }

  /**
   * Генерация цвета на основе строки (для аватара)
   * @param {string} str - Строка для генерации цвета
   * @returns {string} HEX-код цвета
   */
  generateColorFromString(str) {
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
}

// Создаем экземпляр сервиса и экспортируем его
const apiService = new ApiService();
export default apiService; 