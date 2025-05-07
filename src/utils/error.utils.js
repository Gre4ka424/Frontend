/**
 * Утилиты для обработки ошибок
 */

/**
 * Обрабатывает ошибки API и возвращает понятное сообщение для пользователя
 * @param {Error} error - Объект ошибки
 * @returns {string} - Понятное сообщение об ошибке
 */
export const handleApiError = (error) => {
  // Если ошибка содержит сообщение, используем его
  if (error.message) {
    // Проверяем типичные коды ошибок и преобразуем их в понятные сообщения
    if (error.message.includes('401')) {
      return 'Вы не авторизованы. Пожалуйста, войдите в систему.';
    }
    if (error.message.includes('403')) {
      return 'У вас нет доступа к данному ресурсу.';
    }
    if (error.message.includes('404')) {
      return 'Запрашиваемый ресурс не найден.';
    }
    if (error.message.includes('500')) {
      return 'Произошла ошибка на сервере. Пожалуйста, попробуйте позже.';
    }
    
    // Возвращаем оригинальное сообщение об ошибке
    return error.message;
  }
  
  // Если нет сообщения, возвращаем общее сообщение об ошибке
  return 'Произошла неизвестная ошибка. Пожалуйста, попробуйте еще раз.';
};

/**
 * Проверяет, является ли ошибка ошибкой авторизации (401 Unauthorized)
 * @param {Error} error - Объект ошибки
 * @returns {boolean} - true, если ошибка связана с авторизацией
 */
export const isAuthError = (error) => {
  return error.message && error.message.includes('401');
};

/**
 * Обрабатывает ошибки валидации полей формы
 * @param {Object} errors - Объект с ошибками валидации
 * @returns {Object} - Объект с понятными сообщениями об ошибках для каждого поля
 */
export const handleValidationErrors = (errors) => {
  const formattedErrors = {};
  
  for (const field in errors) {
    if (errors.hasOwnProperty(field)) {
      // Преобразуем название поля для более понятного отображения
      const fieldName = formatFieldName(field);
      
      // Форматируем сообщение об ошибке
      formattedErrors[field] = `${fieldName}: ${errors[field]}`;
    }
  }
  
  return formattedErrors;
};

/**
 * Форматирует название поля для более понятного отображения
 * @param {string} fieldName - Название поля
 * @returns {string} - Отформатированное название поля
 */
const formatFieldName = (fieldName) => {
  // Преобразуем snake_case в более читаемый формат
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}; 