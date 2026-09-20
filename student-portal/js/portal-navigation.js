document.addEventListener('DOMContentLoaded', () => {
    const dashboardView = document.getElementById('dashboard-view');
    const links = [...document.querySelectorAll('[data-student-view]')];
    const panels = [...document.querySelectorAll('[data-student-view-panel]')];

    window.activateStudentView = (viewName) => {
        const targetPanel = panels.find((panel) => panel.dataset.studentViewPanel === viewName);
        if (!targetPanel) viewName = 'dashboard';
        links.forEach((link) => {
            const active = link.dataset.studentView === viewName;
            link.classList.toggle('is-active', active);
            if (active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
        panels.forEach((panel) => {
            const active = panel.dataset.studentViewPanel === viewName;
            panel.hidden = !active;
            panel.classList.toggle('is-active', active);
        });
    };

    links.forEach((link) => link.addEventListener('click', () => window.activateStudentView(link.dataset.studentView)));
    if (dashboardView) {
        dashboardView.classList.add('active');
        dashboardView.hidden = false;
        dashboardView.style.display = 'block';
    }
    window.activateStudentView('dashboard');
});
