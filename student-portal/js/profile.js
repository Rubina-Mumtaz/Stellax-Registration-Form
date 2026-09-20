document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-button');
    const menuLogoutButton = document.getElementById('menu-logout');
    const profileTrigger = document.getElementById('profile-trigger');
    const profileMenu = document.getElementById('profile-menu');

    const logout = () => {
        localStorage.removeItem('studentId');
        window.location.href = '../student-login/student-login.html';
    };

    profileTrigger?.addEventListener('click', () => {
        const isOpen = profileMenu?.hidden === false;
        if (profileMenu) profileMenu.hidden = isOpen;
        profileTrigger.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (event) => {
        if (!profileMenu || profileMenu.hidden || profileTrigger?.contains(event.target) || profileMenu.contains(event.target)) return;
        profileMenu.hidden = true;
        profileTrigger?.setAttribute('aria-expanded', 'false');
    });

    logoutButton?.addEventListener('click', logout);
    menuLogoutButton?.addEventListener('click', logout);

    const darkModeToggle = document.querySelector('[data-dark-mode-toggle]');
    darkModeToggle?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('studentPortalDarkMode', document.body.classList.contains('dark-mode') ? 'on' : 'off');
    });

    if (localStorage.getItem('studentPortalDarkMode') === 'on') {
        document.body.classList.add('dark-mode');
    }

    document.querySelectorAll('.copy-btn').forEach((button) => {
        button.addEventListener('click', async () => {
            const voucherId = button.closest('td')?.textContent.trim().split(' ')[0];
            if (!voucherId || !navigator.clipboard) return;
            await navigator.clipboard.writeText(voucherId);
            button.setAttribute('aria-label', 'Voucher ID copied');
        });
    });
});
