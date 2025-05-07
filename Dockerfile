FROM nginx:alpine

# Создаем директорию для статических файлов
RUN mkdir -p /usr/share/nginx/html

# Копирование HTML файлов
COPY *.html /usr/share/nginx/html/

# Копирование статических файлов
COPY static/ /usr/share/nginx/html/static/

# Копирование файлов из src (сервисы, утилиты, типы)
COPY src/ /usr/share/nginx/html/src/

# Настройка Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открытие порта
EXPOSE 80

# Запуск Nginx
CMD ["nginx", "-g", "daemon off;"] 
