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
        { label: 'My Profile', action: () => { if (window.router) window.router.navigate('/profile'); } },
        { label: 'My Events', action: () => { if (window.router) window.router.navigate('/events?filter=my'); } },
        { label: 'Create Event', action: () => { if (window.router) window.router.navigate('/create-event'); } },
        { label: 'Settings', action: () => { if (window.router) window.router.navigate('/settings'); } },
        { label: 'Logout', action: () => { 
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
        const menuLink = document.createElement('a');
        menuLink.href = '#';
        menuLink.textContent = item.label;
        menuLink.addEventListener('click', (e) => {
            e.preventDefault();
            item.action();
            dropdown.style.display = 'none'; // Скрываем меню после выбора
        });
        
        menuItem.appendChild(menuLink);
        dropdownMenu.appendChild(menuItem);
    });
    
    // Собираем выпадающее меню
    dropdown.appendChild(dropdownHeader);
    dropdown.appendChild(dropdownMenu);
    
    // Добавляем меню в контейнер
    container.appendChild(dropdown);
} 