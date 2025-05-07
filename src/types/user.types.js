/**
 * Интерфейсы для работы с данными пользователей
 */

// Профиль пользователя
export const UserProfile = {
  /**
   * @typedef {Object} UserProfile
   * @property {string|null} birth_date - Дата рождения пользователя
   * @property {string|null} gender - Пол пользователя
   * @property {string[]} interests - Список интересов пользователя
   * @property {number[]} joined_groups - Список ID групп, в которых состоит пользователь
   * @property {boolean} onboarding_completed - Завершил ли пользователь онбординг
   */
};

// Данные для обновления профиля пользователя
export const UserProfileUpdate = {
  /**
   * @typedef {Object} UserProfileUpdate
   * @property {string|null} [birth_date] - Дата рождения пользователя
   * @property {string|null} [gender] - Пол пользователя
   * @property {string[]} [interests] - Список интересов пользователя
   * @property {number[]} [joined_groups] - Список ID групп, в которых состоит пользователь
   * @property {boolean} [onboarding_completed] - Завершил ли пользователь онбординг
   */
};

// Запрос на авторизацию
export const LoginRequest = {
  /**
   * @typedef {Object} LoginRequest
   * @property {string} username - Имя пользователя
   * @property {string} password - Пароль пользователя
   */
};

// Ответ на успешную авторизацию
export const AuthResponse = {
  /**
   * @typedef {Object} AuthResponse
   * @property {string} access_token - JWT токен доступа
   * @property {string} token_type - Тип токена (обычно "bearer")
   */
}; 