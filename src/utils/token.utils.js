/**
 * Утилиты для работы с токенами авторизации
 */

/**
 * Сохраняет токен авторизации в localStorage
 * @param {string} token - Токен доступа
 * @param {string} tokenType - Тип токена (по умолчанию 'bearer')
 */
export const saveToken = (token, tokenType = 'bearer') => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('token_type', tokenType);
};

/**
 * Получает токен авторизации из localStorage
 * @returns {string|null} - Токен авторизации или null, если токен не найден
 */
export const getToken = () => {
  return localStorage.getItem('auth_token');
};

/**
 * Получает тип токена из localStorage
 * @returns {string} - Тип токена (по умолчанию 'bearer')
 */
export const getTokenType = () => {
  return localStorage.getItem('token_type') || 'bearer';
};

/**
 * Удаляет токен авторизации из localStorage
 */
export const removeToken = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token_type');
};

/**
 * Проверяет, авторизован ли пользователь (есть ли токен)
 * @returns {boolean} - true, если пользователь авторизован
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Формирует заголовок Authorization для запросов
 * @returns {string|null} - Заголовок Authorization или null, если пользователь не авторизован
 */
export const getAuthHeader = () => {
  const token = getToken();
  const tokenType = getTokenType();
  
  if (!token) {
    return null;
  }
  
  return `${tokenType.charAt(0).toUpperCase() + tokenType.slice(1)} ${token}`;
}; 