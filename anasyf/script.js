

import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls.js';

// --- GLOBAL VARIABLES & CONFIG ---
let isHeroVisible = true;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CONFIG = {
    globeRadius: 6,
    pointCount: 8000,
    pointSize: 0.20,
    pointColor: 0xE6EEF5,
    waterColor: 0x081c30,
    maxActiveRoutes: 5,
    planeSpeed: 0.005,
    mapUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg'
};

const ROUTE_COLORS = [0xFFD700, 0xFFAA00, 0xFFF5CC, 0xE6C200]; // Design System Gold Tones

const CITIES = [
    { lat: 40.71, lon: -74.00 }, // New York
    { lat: 52.52, lon: 13.40 },  // Berlin
    { lat: 41.00, lon: 28.97 },  // Istanbul
    { lat: 30.04, lon: 31.23 },  // Cairo
    { lat: -26.20, lon: 28.04 }, // Johannesburg
    { lat: 55.75, lon: 37.61 },  // Moscow
    { lat: 6.61, lon: 20.93 }    // Lagos
];

// --- 1. UI INTERACTION FUNCTIONS (Window Binding for HTML onclicks) ---

/* Toggle Sticky Search Bar */
window.toggleStickySearch = function() {
    const stickySearch = document.getElementById('stickySearch');
    const toggle = document.getElementById('stickySearchToggle');
    stickySearch.classList.toggle('active');
    if (stickySearch.classList.contains('active')) {
        document.getElementById('toggleIcon').textContent = '✕';
    } else {
        document.getElementById('toggleIcon').textContent = '🔍';
    }
};

/* Search Toggle Logic */
window.toggleSearchType = function() {
    const typeSpan = document.getElementById('search-type');
    if (typeSpan.innerText === 'Products') {
        typeSpan.innerText = 'RFQs';
        document.getElementById('search-input').placeholder = 'Search for active RFQs...';
    } else {
        typeSpan.innerText = 'Products';
        document.getElementById('search-input').placeholder = 'Search for products, companies...';
    }
};

window.applySearch = function(term) {
    document.getElementById('search-input').value = term;
};

/* Scroll & Tab Logic */
window.selectTabAndScroll = function(tabName) {
    const dashboard = document.getElementById('dashboard-container');
    dashboard.scrollIntoView({ behavior: 'smooth' });
    const btn = document.querySelector(`button[onclick="openTab('${tabName}', this)"]`);
    if (btn) {
        window.openTab(tabName, btn);
    }
};

window.scrollToId = function(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
};

window.openTab = function(tabName, btn) {
    document.querySelectorAll('.tab-content').forEach(t => {
        t.style.display = 'none';
        t.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const selected = document.getElementById(tabName);
    selected.style.display = 'flex';

    setTimeout(() => {
        selected.classList.add('active');
        window.manageScrollArrows('products', 'dash-left', 'dash-right');
        window.manageScrollArrows('requests', 'dash-left', 'dash-right');
    }, 10);

    btn.classList.add('active');
};

window.scrollSection = function(containerId, direction) {
    const container = document.getElementById(containerId);
    const scrollAmount = 320;
    if (direction === 'left') container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    else container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
};

window.scrollDashboard = function(direction, tabName = 'products') {
    const tabContent = document.getElementById(tabName);
    if (!tabContent) return;
    // Scroll by approximately one visible viewport of the container (works for responsive counts)
    const scrollAmount = Math.max(320, Math.round(tabContent.clientWidth * 0.95));
    if (direction === 'left') tabContent.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    else tabContent.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    
    // Update arrow visibility for this specific tab
    if (tabName === 'products') {
        window.manageScrollArrows('products', 'dash-left', 'dash-right');
    } else if (tabName === 'requests') {
        window.manageScrollArrows('requests', 'dash-left-rfq', 'dash-right-rfq');
    }
};

/* Arrow Visibility Management */
window.manageScrollArrows = function(containerId, leftBtnId, rightBtnId) {
    const container = document.getElementById(containerId);
    const leftBtn = document.getElementById(leftBtnId);
    const rightBtn = document.getElementById(rightBtnId);

    if (!container || !leftBtn || !rightBtn) return;

    const updateArrows = () => {
        if (container.scrollLeft > 20) leftBtn.classList.add('visible');
        else leftBtn.classList.remove('visible');

        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 5) rightBtn.classList.remove('visible');
        else rightBtn.classList.add('visible');
    };

    // Remove old listener to prevent duplicates and add new one
    container.onscroll = updateArrows; 
    updateArrows(); // Initial check
};


// --- 2. THREE.JS GLOBE SETUP ---

function initGlobe() {
    const container = document.getElementById('hero-section');
    const loadingElement = document.getElementById('loading');
    
    if(!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030e1a, 0.015);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 35;
    camera.position.y = 35;

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;

    if (prefersReducedMotion) {
        controls.autoRotate = false;
    } else {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2.0;
    }

    const globeGroup = new THREE.Group();
    globeGroup.rotation.z = 23.5 * (Math.PI / 180);
    scene.add(globeGroup);
    globeGroup.scale.set(1.3, 1.3, 1.3);

    // Water Sphere
    const waterGeo = new THREE.SphereGeometry(CONFIG.globeRadius - 0.05, 64, 64);
    const waterMat = new THREE.MeshBasicMaterial({
        color: CONFIG.waterColor,
        transparent: true,
        opacity: 0.9,
        side: THREE.FrontSide
    });
    const waterSphere = new THREE.Mesh(waterGeo, waterMat);
    globeGroup.add(waterSphere);

    // Helpers
    function latLonToVector3(lat, lon, radius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const z = (radius * Math.sin(phi) * Math.sin(theta));
        const y = (radius * Math.cos(phi));
        return new THREE.Vector3(x, y, z);
    }

    const circleTexture = (() => {
        const s = 64;
        const c = document.createElement('canvas');
        c.width = s;
        c.height = s;
        const ctx = c.getContext('2d');
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        return new THREE.CanvasTexture(c);
    })();

    // Load Data & Map
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    let globalImageData = null;
    const globalPositions = [];
    let currentPointIndex = 0;

    loader.load(CONFIG.mapUrl, (texture) => {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 512;
        const ctx = c.getContext('2d');
        ctx.drawImage(texture.image, 0, 0, 1024, 512);
        globalImageData = ctx.getImageData(0, 0, 1024, 512);
        processChunk();
    }, undefined, () => {
        globalImageData = { width: 0, height: 0, data: [] };
        processChunk();
    });

    function processChunk() {
        const chunkSize = 5000;
        let processed = 0;
        const phi = Math.PI * (3 - Math.sqrt(5));
        const { width, height, data } = globalImageData;
        const dummyObj = new THREE.Vector3();

        while (currentPointIndex < CONFIG.pointCount && processed < chunkSize) {
            const i = currentPointIndex;
            const y = 1 - (i / (CONFIG.pointCount - 1)) * 2;
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = phi * i;
            const x = Math.cos(theta) * radiusAtY;
            const z = Math.sin(theta) * radiusAtY;

            let isLand = true;
            if (width > 0) {
                const u = 0.5 + Math.atan2(x, z) / (2 * Math.PI);
                const v = 0.5 - Math.asin(y) / Math.PI;
                const px = (u * width) | 0;
                const py = (v * height) | 0;
                const idx = (py * width + px) * 4;
                isLand = data[idx] > 80;
            }

            if (isLand) {
                dummyObj.set(x, y, z).normalize().multiplyScalar(CONFIG.globeRadius + 0.05);
                globalPositions.push(dummyObj.x, dummyObj.y, dummyObj.z);
            }

            currentPointIndex++;
            processed++;
        }

        if (currentPointIndex < CONFIG.pointCount) {
            requestAnimationFrame(processChunk);
        } else {
            finalizeGlobe();
        }
    }

    function finalizeGlobe() {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(globalPositions, 3));
        const mat = new THREE.PointsMaterial({
            size: CONFIG.pointSize,
            color: CONFIG.pointColor,
            map: circleTexture,
            transparent: true,
            opacity: 1.0,
            alphaTest: 0.05,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        globeGroup.add(new THREE.Points(geo, mat));

        // Intro Animation via GSAP
        if (prefersReducedMotion) {
            loadingElement.style.display = 'none';
            document.getElementById('canvas-container').style.opacity = 1;
            globeGroup.scale.set(1, 1, 1);
            document.querySelectorAll('.floating-widget, .social-proof-bar, .hero-interactions').forEach(el => {
                el.style.opacity = 1;
                el.style.transform = 'none';
            });
        } else {
            const tl = gsap.timeline();
            tl.to(loadingElement, { duration: 0.3, opacity: 0, ease: "power2.inOut", onComplete: () => { loadingElement.style.display = 'none'; } });
            tl.to('#canvas-container', { duration: 1.2, opacity: 1, ease: "power2.out" }, "-=0.3");
            tl.to(globeGroup.scale, { duration: 1.5, x: 1, y: 1, z: 1, ease: "back.out(1.2)" }, "<");
            tl.to(".hero-interactions", { opacity: 1, y: 0, duration: 0.6 }, "-=1.0");
            tl.to("#w1", { opacity: 1, y: 0, duration: 0.2 }, "-=1.2");
            tl.to("#w2", { opacity: 1, y: 0, duration: 0.2 }, "-=1.1");
            tl.to("#w3", { opacity: 1, y: 0, duration: 0.2 }, "-=1.0");
            tl.to("#w4", { opacity: 1, y: 0, duration: 0.2 }, "-=0.9");
            tl.to(".social-proof-bar", { opacity: 1, y: 0, duration: 0.3 }, "-=0.7");
            
            startPlaneSystem();
        }
    }

    // Plane Logic
    const vertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    const planeFragmentShader = `uniform float progress; uniform vec3 color; varying vec2 vUv; void main() { float trailLength = 0.45; float dist = progress - vUv.x; float alpha = 0.0; if (dist > 0.0 && dist < trailLength) { alpha = smoothstep(trailLength, 0.0, dist); } gl_FragColor = vec4(color, alpha); }`;
    const activeRoutes = [];

    function spawnRoute() {
        if (prefersReducedMotion) return;
        const start = CITIES[Math.floor(Math.random() * CITIES.length)];
        let end = CITIES[Math.floor(Math.random() * CITIES.length)];
        while (start === end) end = CITIES[Math.floor(Math.random() * CITIES.length)];

        const vStart = latLonToVector3(start.lat, start.lon, CONFIG.globeRadius);
        const vEnd = latLonToVector3(end.lat, end.lon, CONFIG.globeRadius);
        const dist = vStart.distanceTo(vEnd);
        const mid = vStart.clone().add(vEnd).multiplyScalar(0.5);
        const alt = mid.length() + (dist * 0.7);
        mid.normalize().multiplyScalar(alt);

        const curve = new THREE.QuadraticBezierCurve3(vStart, mid, vEnd);
        const tubeGeo = new THREE.TubeGeometry(curve, 128, 0.05, 8, false);
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                progress: { value: 0.0 },
                color: { value: new THREE.Color(ROUTE_COLORS[Math.floor(Math.random() * ROUTE_COLORS.length)]) }
            },
            vertexShader: vertexShader,
            fragmentShader: planeFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(tubeGeo, mat);
        globeGroup.add(mesh);
        activeRoutes.push({ mesh: mesh, speed: CONFIG.planeSpeed, progress: 0 });
    }

    let routeInterval = null;

    function startPlaneSystem() {
        setTimeout(() => {
            if (isHeroVisible) {
                for (let i = 0; i < 8; i++) setTimeout(() => { if (isHeroVisible) spawnRoute(); }, i * 400);
                routeInterval = setInterval(() => { if (activeRoutes.length < CONFIG.maxActiveRoutes) spawnRoute(); }, 1300);
            }
        }, 1500);
    }

    function updateRoutes() {
        if (prefersReducedMotion) return;
        for (let i = activeRoutes.length - 1; i >= 0; i--) {
            const r = activeRoutes[i];
            r.progress += r.speed;
            r.mesh.material.uniforms.progress.value = r.progress;
            if (r.progress > 1.4) {
                globeGroup.remove(r.mesh);
                r.mesh.geometry.dispose();
                r.mesh.material.dispose();
                activeRoutes.splice(i, 1);
            }
        }
    }

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    function animate() {
        requestAnimationFrame(animate);
        if (isHeroVisible) {
            controls.update();
            updateRoutes();
            renderer.render(scene, camera);
        }
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isHeroVisible = entry.isIntersecting;
            if (!isHeroVisible && routeInterval) {
                clearInterval(routeInterval);
                routeInterval = null;
            } else if (isHeroVisible && !routeInterval && !prefersReducedMotion) {
                routeInterval = setInterval(() => { if (activeRoutes.length < CONFIG.maxActiveRoutes) spawnRoute(); }, 1000);
            }
        });
    }, { threshold: 0.1 });
    observer.observe(container);

    animate();
}


// --- 3. DOM CONTENT LOADED LOGIC (Data Injection & Event Listeners) ---

document.addEventListener('DOMContentLoaded', () => {

    // --- Init Modules ---
    initGlobe();

    // --- Navbar Observer ---
    const navObserver = new IntersectionObserver((entries) => {
        const nav = document.querySelector('.navbar');
        if (!entries.isIntersecting) { nav.classList.add('scrolled'); } else { nav.classList.remove('scrolled'); }
    });
    const pixelGuard = document.getElementById('pixel-guard');
    if(pixelGuard) navObserver.observe(pixelGuard);

    // --- Sticky Search Bar Observer ---
    const stickySearch = document.getElementById('stickySearch');
    const heroSection = document.getElementById('hero-section');
    const toggle = document.getElementById('stickySearchToggle');
    const stickyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                toggle.classList.add('visible');
            } else {
                toggle.classList.remove('visible');
                stickySearch.classList.remove('active');
                document.getElementById('toggleIcon').textContent = '🔍';
            }
        });
    }, { threshold: 0 });
    if(heroSection) stickyObserver.observe(heroSection);


    // --- FAQ Logic ---
    document.querySelectorAll('.faq-item').forEach(item => {
        item.querySelector('.faq-question').addEventListener('click', () => {
            item.classList.toggle('active');
            const ans = item.querySelector('.faq-answer');
            if (item.classList.contains('active')) ans.style.maxHeight = ans.scrollHeight + "px";
            else ans.style.maxHeight = null;
        });
    });

    // --- Data Definition ---
    const productsData = [
        { t: "Luxury Marble", c: "Premium", d: "Afyon White", f: "🇹🇷", country: "Turkey" },
        { t: "CNC Milling", c: "Machinery", d: "5-Axis Precision", f: "🇩🇪", country: "Germany" },
        { t: "Silk Fabrics", c: "Textile", d: "Raw Silk Rolls", f: "🇨🇳", country: "China" },
        { t: "Olive Oil", c: "Food", d: "Extra Virgin, 500L", f: "🇮🇹", country: "Italy" },
        { t: "Solar Panels", c: "Energy", d: "550W Mono", f: "🇰🇷", country: "S. Korea" },
        { t: "Ceramic Tiles", c: "Construction", d: "60x120 Porcelain", f: "🇪🇸", country: "Spain" },
        { t: "Cotton Yarn", c: "Textile", d: "100% Organic", f: "🇮🇳", country: "India" },
        { t: "Steel Pipes", c: "Industrial", d: "Seamless Heavy", f: "🇺🇦", country: "Ukraine" }
    ];

    const requestsData = [
        { t: "Steel Beams", qty: "500 Ton", d: "15 Jan", f: "🇩🇪", country: "Germany" },
        { t: "Sea Freight", qty: "20 Containers", d: "Urgent", f: "🇺🇸", country: "USA" },
        { t: "Microchips", qty: "5k Units", d: "20 Jan", f: "🇯🇵", country: "Japan" },
        { t: "Wheat Bulk", qty: "1000 Ton", d: "01 Feb", f: "🇪🇬", country: "Egypt" },
        { t: "Polymer", qty: "200 Ton", d: "10 Feb", f: "🇵🇱", country: "Poland" }
    ];

    const fairsData = [
        { t: "Dubai Big 5", c: "Construction", d: "04 DEC", m: "DEC" },
        { t: "Marseille Meetup", c: "Twinning", d: "12 JUL", m: "JUL" },
        { t: "CES Las Vegas", c: "Tech", d: "08 JAN", m: "JAN" },
        { t: "Yapı Fuarı Ist", c: "Domestic", d: "20 APR", m: "APR" },
        { t: "FinTech London", c: "Finance", d: "15 JUN", m: "JUN" },
        { t: "Canton Fair", c: "General", d: "15 OCT", m: "OCT" },
        { t: "Hannover Messe", c: "Industry", d: "17 APR", m: "APR" }
    ];

    // --- Data Injection ---
    
    // Featured Products
    const productsGrid = document.getElementById('products-grid');
    if(productsGrid) {
        productsData.forEach((p, index) => {
            const el = document.createElement('div');
            el.className = 'product-card';
            el.innerHTML = `
                <div class="product-card-image">
                    <img src="product.png" loading="lazy" alt="${p.t}">
                </div>
                <div class="product-card-content">
                    <div class="product-card-country">
                        <span>${p.f}</span>
                        <span>${p.country}</span>
                    </div>
                    <h3 class="product-card-name">${p.t}</h3>
                    <p class="product-card-description">${p.d}</p>
                    <button class="product-card-btn">Send Message</button>
                </div>
            `;
            productsGrid.appendChild(el);
        });
        // Wire arrow visibility and scroll handling for products
        const productsContainer = document.getElementById('products');
        if (productsContainer) {
            productsContainer.addEventListener('scroll', () => { window.manageScrollArrows('products', 'dash-left', 'dash-right'); });
            window.manageScrollArrows('products', 'dash-left', 'dash-right');
        }
    }

    // Requests
    const reqContainer = document.getElementById('requests');
    if(reqContainer) {
        requestsData.forEach((r, index) => {
            const el = document.createElement('div'); el.className = 'card request';
            el.innerHTML = `<div class="content"><div class="card-header-row"><span class="badge-slate" style="font-size:12px; background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:6px;">RFQ</span> <span style="font-size:12px; color:#94a3b8;">${r.d}</span></div><h3 class="card-title">${r.t}</h3><div class="card-country-row"><span style="font-size:16px;">${r.f}</span> <span>Target: ${r.country}</span></div><div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:auto;"><span style="display:block; font-size:11px; color:#64748b;">Quantity</span><span style="font-size:14px; font-weight:700; color:#fff;">${r.qty}</span></div><button class="card-btn btn-quote">Quote</button></div>`;
            reqContainer.appendChild(el);
        });
        // Listener for arrow visibility
        reqContainer.addEventListener('scroll', () => { window.manageScrollArrows('requests', 'dash-left-rfq', 'dash-right-rfq'); });
        window.manageScrollArrows('requests', 'dash-left-rfq', 'dash-right-rfq');
    }

    // Fairs
    const fairContainer = document.getElementById('fair-container');
    if(fairContainer) {
        fairsData.forEach(f => {
            const el = document.createElement('div'); el.className = 'fair-card';
            el.innerHTML = `<div class="fair-content"><h3 class="fair-card-title" style="color:#fff; font-size:20px; font-weight:700;">${f.t}</h3><p class="fair-card-desc" style="color:#94a3b8; font-size:13px;">${f.c}</p><div class="fair-visual-area"><div class="fair-date-box"><span class="fair-date-day">${f.d.split(' ')}</span><span class="fair-date-month">${f.m}</span></div></div></div>`;
            fairContainer.appendChild(el);
        });
        fairContainer.addEventListener('scroll', () => { window.manageScrollArrows('fair-container', 'fair-left', 'fair-right'); });
        window.manageScrollArrows('fair-container', 'fair-left', 'fair-right');
    }

    // News Scroll Logic
    const newsContainer = document.getElementById('news-scroll-wrapper');
    if (newsContainer) {
        newsContainer.addEventListener('scroll', () => { window.manageScrollArrows('news-scroll-wrapper', 'news-left', 'news-right'); });
        window.manageScrollArrows('news-scroll-wrapper', 'news-left', 'news-right');
    }


    // --- Carousel Logic (Companies) ---
    const companies = [
        { name: 'EuroLogistics', logo: 'EL', country: 'DE', flag: '🇩🇪', category: 'Logistics & Shipping', rating: 4.9, volume: '€50M+' },
        { name: 'AsiaTech Mfg', logo: 'AT', country: 'CN', flag: '🇨🇳', category: 'Electronics Mfg', rating: 4.8, volume: '$120M+' },
        { name: 'Nordic Supply', logo: 'NS', country: 'SE', flag: '🇸🇪', category: 'Raw Materials', rating: 5.0, volume: '€85M+' },
        { name: 'Anatolia Tex', logo: 'AX', country: 'TR', flag: '🇹🇷', category: 'Textiles & Fabrics', rating: 4.9, volume: '$40M+' },
        { name: 'US Polymers', logo: 'UP', country: 'US', flag: '🇺🇸', category: 'Chemical Products', rating: 4.7, volume: '$200M+' },
        { name: 'Koto Automotive', logo: 'KA', country: 'JP', flag: '🇯🇵', category: 'Auto Spare Parts', rating: 4.9, volume: '¥900M+' },
        { name: 'Brasilia Coffee', logo: 'BC', country: 'BR', flag: '🇧🇷', category: 'Food Exports', rating: 4.6, volume: '$30M+' },
        { name: 'Royal Steel', logo: 'RS', country: 'UK', flag: '🇬🇧', category: 'Industrial Metals', rating: 4.8, volume: '£60M+' }
    ];

    // Ripple handler removed for widgets to use hero button interactions

    const sceneC = document.getElementById('carouselScene');
    const containerC = document.getElementById('carouselContainer');

    if(sceneC && containerC) {
        const radius = 550;
        const totalCards = companies.length;
        const angleStep = (2 * Math.PI) / totalCards;
        const defaultSpeed = 0.0012;
        const slowSpeed = defaultSpeed / 3;

        let currentRotation = 0; let targetRotation = 0; let currentSpeed = defaultSpeed;
        let isDragging = false; let startX = 0; let startRotation = 0; let velocity = 0; let lastX = 0; let lastTime = Date.now();

        const verifiedIcon = `<svg class="verified-badge" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>`;

        companies.forEach((company, i) => {
            const card = document.createElement('div'); card.className = 'company-card';
            card.innerHTML = `<div class="card-inner"><div class="card-header"><div class="logo-box">${company.logo}</div><div class="country-flag" title="${company.country}">${company.flag}</div></div><div class="company-info"><div class="name-row"><h3 class="company-name">${company.name}</h3>${verifiedIcon}</div><div class="company-category">${company.category}</div><div class="rating-box"><svg class="star-icon" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg><span>${company.rating}</span></div><div class="metrics"><div class="metric-item"><span class="metric-value">${company.volume}</span><span class="metric-label">Trade Vol.</span></div><div class="metric-item"><span class="metric-value">< 24h</span><span class="metric-label">Response</span></div></div></div><div class="card-action">View Profile</div></div>`;
            sceneC.appendChild(card);
        });

        const cards = document.querySelectorAll('.company-card');

        function updateCarousel() {
            cards.forEach((card, i) => {
                const angle = angleStep * i + currentRotation;
                const x = Math.sin(angle) * radius; const z = Math.cos(angle) * radius; const normalizedZ = Math.cos(angle);
                const opacity = (normalizedZ + 1.5) / 2.5;
                card.style.transform = `translate3d(${x}px, 0, ${z}px) rotateY(${-angle}rad)`;
                card.style.opacity = opacity; card.style.zIndex = Math.round(z + radius);
                if (normalizedZ > 0.95) { card.classList.add('active'); card.style.opacity = 1; } else { card.classList.remove('active'); }
            });
        }

        containerC.addEventListener('mouseenter', () => { currentSpeed = slowSpeed; });
        containerC.addEventListener('mouseleave', () => { currentSpeed = defaultSpeed; });

        function handleStart(e) { isDragging = true; startX = e.type.includes('mouse') ? e.clientX : e.touches.clientX; startRotation = currentRotation; targetRotation = currentRotation; velocity = 0; lastX = startX; lastTime = Date.now(); }
        function handleMove(e) { if (!isDragging) return; e.preventDefault(); const currentX = e.type.includes('mouse') ? e.clientX : e.touches.clientX; const deltaX = currentX - startX; currentRotation = startRotation + (deltaX / containerC.offsetWidth) * Math.PI * 2; targetRotation = currentRotation; const currentTime = Date.now(); const timeDelta = currentTime - lastTime; if (timeDelta > 0) { velocity = (currentX - lastX) / timeDelta; } lastX = currentX; lastTime = currentTime; }
        function handleEnd() { if (!isDragging) return; isDragging = false; velocity *= 0.5; }

        containerC.addEventListener('mousedown', handleStart); containerC.addEventListener('mousemove', handleMove); containerC.addEventListener('mouseup', handleEnd); containerC.addEventListener('mouseleave', handleEnd); containerC.addEventListener('touchstart', handleStart, { passive: true }); containerC.addEventListener('touchmove', handleMove, { passive: false }); containerC.addEventListener('touchend', handleEnd);

        function animateCarousel() {
            if (!isDragging) {
                targetRotation += currentSpeed;
                if (Math.abs(velocity) > 0.0001) { targetRotation += velocity * 0.5; velocity *= 0.95; } else { velocity = 0; }
                currentRotation += (targetRotation - currentRotation) * 0.05;
            }
            updateCarousel();
            requestAnimationFrame(animateCarousel);
        }

        updateCarousel(); animateCarousel();
    }
});

