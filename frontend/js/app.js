/* ==========================================================
   SPA router + dynamic content
   - Every <section class="view"> is one "page".
   - The URL hash (#about, #contact, ...) decides which one is visible.
   - Nothing reloads: we only toggle the `hidden` attribute.
   ========================================================== */
(() => {
    'use strict';

    const DEFAULT_ROUTE = 'home';

    // route id -> title shown in <title>, <h1> and the breadcrumb
    const ROUTES = {
        home: 'Home',
        about: 'About',
        projects: 'Projects',
        contact: 'Contact',
    };

    // Some views need to fetch data the first time they are opened.
    const LOADERS = { projects: loadProjects };
    const alreadyLoaded = new Set();

    const views = document.querySelectorAll('.view');
    const navLinks = document.querySelectorAll('[data-route]');
    const pageTitle = document.getElementById('pageTitle');
    const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');

    /* ---------- Router ---------- */

    function currentRoute() {
        return location.hash.replace(/^#\/?/, '') || DEFAULT_ROUTE;
    }

    function navigate() {
        const requested = currentRoute();
        const known = Object.prototype.hasOwnProperty.call(ROUTES, requested);
        const viewId = known ? requested : 'notfound';
        const title = known ? ROUTES[requested] : 'Page not found';

        views.forEach((view) => {
            view.hidden = view.id !== viewId;
        });

        navLinks.forEach((link) => {
            const active = link.dataset.route === requested;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });

        pageTitle.textContent = title;
        breadcrumbCurrent.textContent = title;
        document.title = `${title} - My Project`;

        // Load data on demand (only once per view)
        if (known && LOADERS[requested] && !alreadyLoaded.has(requested)) {
            alreadyLoaded.add(requested);
            LOADERS[requested]();
        }

        // On phones the sidebar overlays the page: close it after choosing a link
        if (window.innerWidth < 992) {
            document.body.classList.remove('sb-sidenav-toggled');
        }
        window.scrollTo(0, 0);
    }

    window.addEventListener('hashchange', navigate);
    window.addEventListener('DOMContentLoaded', navigate);

    /* ---------- AJAX: projects ---------- */

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function projectCard(p) {
        const tags = (p.tags || [])
            .map((t) => `<span class="badge bg-secondary me-1">${escapeHtml(t)}</span>`)
            .join('');
        return `
            <div class="col-xl-3 col-md-6 mb-4">
                <div class="card project-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${escapeHtml(p.title)}</h5>
                        <p class="card-text">${escapeHtml(p.description)}</p>
                        ${tags}
                    </div>
                    <div class="card-footer">
                        <a class="small stretched-link" href="${escapeHtml(p.link || '#projects')}">Open project <i class="fas fa-angle-right"></i></a>
                    </div>
                </div>
            </div>`;
    }

    async function loadProjects() {
        const box = document.getElementById('projectsContainer');
        box.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
            </div>`;
        try {
            const response = await fetch('data/projects.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const projects = await response.json();
            box.innerHTML = projects.map(projectCard).join('');
        } catch (err) {
            alreadyLoaded.delete('projects'); // allow a retry next time
            const hint = location.protocol === 'file:'
                ? 'Browsers block fetch() on file:// pages. Start a local server (e.g. VS Code "Live Server" or <code>python -m http.server</code>) and open http://localhost instead.'
                : 'Please try again later.';
            box.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger" role="alert">
                        <strong>Could not load projects.</strong> ${hint}
                    </div>
                </div>`;
            console.error('loadProjects failed:', err);
        }
    }

    /* ---------- Contact form (no page reload) ---------- */

    const form = document.getElementById('contactForm');
    const formAlert = document.getElementById('contactAlert');

    form.addEventListener('submit', (event) => {
        event.preventDefault(); // stop the browser from reloading the page
        formAlert.innerHTML = '';

        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        // A real site would POST the data here, e.g. fetch('/api/contact', {...})
        const name = escapeHtml(document.getElementById('contactName').value.trim());
        formAlert.innerHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                Thanks, <strong>${name}</strong>! Your message was sent.
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
        form.reset();
        form.classList.remove('was-validated');
    });
})();
