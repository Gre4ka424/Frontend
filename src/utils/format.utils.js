// format.utils.js

/**
 * Форматирует дату в локализованную строку
 * @param {string|Date} dateString - Дата или строка с датой
 * @param {string} locale - Локаль для форматирования (по умолчанию ru-RU)
 * @returns {string} Отформатированная дата
 */
export function formatDate(dateString, locale = 'ru-RU') {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(locale, options);
}

/**
 * Форматирует время в локализованную строку
 * @param {string|Date} timeString - Время или строка со временем
 * @param {string} locale - Локаль для форматирования (по умолчанию ru-RU)
 * @returns {string} Отформатированное время
 */
export function formatTime(timeString, locale = 'ru-RU') {
  const date = new Date(timeString);
  const options = { hour: 'numeric', minute: 'numeric' };
  return date.toLocaleTimeString(locale, options);
}

/**
 * Форматирует дату и время в локализованную строку
 * @param {string|Date} dateTimeString - Дата и время или строка с датой и временем
 * @param {string} locale - Локаль для форматирования (по умолчанию ru-RU)
 * @returns {string} Отформатированные дата и время
 */
export function formatDateTime(dateTimeString, locale = 'ru-RU') {
  const date = new Date(dateTimeString);
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: 'numeric', 
    minute: 'numeric'
  };
  return date.toLocaleString(locale, options);
}

/**
 * Преобразует строку с разделителями-запятыми в массив строк
 * @param {string} str - Строка с разделителями-запятыми
 * @returns {string[]} Массив строк
 */
export function stringToArray(str) {
  if (!str) return [];
  return str.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Преобразует массив строк в строку с разделителями-запятыми
 * @param {string[]} arr - Массив строк
 * @returns {string} Строка с разделителями-запятыми
 */
export function arrayToString(arr) {
  if (!arr || !Array.isArray(arr)) return '';
  return arr.join(', ');
} 