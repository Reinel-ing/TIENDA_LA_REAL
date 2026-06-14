// ===== ESTADO =====
let catalogCart = JSON.parse(localStorage.getItem('catalogCart') || '[]');
let activeFilter = '';

// ===== CARRITO =====
function addToCart(id, nombre, precio, stock) {
    const existing = catalogCart.find(i => i.id === id);
    if (existing) {
        if (existing.cantidad >= stock) { toast('Sin stock suficiente', '#e94560'); return; }
        existing.cantidad++;
        existing.subtotal = existing.cantidad * existing.precio;
    } else {
        catalogCart.push({ id, nombre, precio, cantidad: 1, subtotal: precio, stock });
    }
    saveCart();
    refreshBadge();
    flashBtn(id);
}

function removeFromCart(id) {
    catalogCart = catalogCart.filter(i => i.id !== id);
    saveCart();
    refreshBadge();
    renderCartItems();
}

function updateQty(id, delta) {
    const item = catalogCart.find(i => i.id === id);
    if (!item) return;
    const nq = item.cantidad + delta;
    if (nq <= 0) { removeFromCart(id); return; }
    if (nq > item.stock) { toast('Sin stock suficiente', '#e94560'); return; }
    item.cantidad = nq;
    item.subtotal = nq * item.precio;
    saveCart();
    refreshBadge();
    renderCartItems();
}

function saveCart() {
    localStorage.setItem('catalogCart', JSON.stringify(catalogCart));
}

function getTotal() {
    return catalogCart.reduce((s, i) => s + i.subtotal, 0);
}

function refreshBadge() {
    const count = catalogCart.reduce((s, i) => s + i.cantidad, 0);
    const badge = document.getElementById('cartBadge');
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

function flashBtn(id) {
    const btn = document.querySelector(`[data-id="${id}"]`);
    if (!btn) return;
    btn.classList.add('added');
    btn.textContent = '¡Agregado!';
    setTimeout(() => {
        btn.classList.remove('added');
        btn.textContent = 'Agregar';
    }, 1000);
}

// ===== RENDER CARRITO =====
function renderCartItems() {
    const container = document.getElementById('cartItemsList');
    const total = getTotal();

    if (!catalogCart.length) {
        container.innerHTML = `
            <div class="cart-empty-state">
                <div style="font-size:40px;margin-bottom:8px">🛒</div>
                <div>Tu carrito está vacío</div>
                <small style="color:#bbb">Agrega productos para empezar</small>
            </div>`;
    } else {
        container.innerHTML = catalogCart.map(item => `
            <div class="cci">
                <div class="cci-name">${escHtml(item.nombre)}</div>
                <div class="cci-qty">
                    <button onclick="updateQty(${item.id},-1)">−</button>
                    <span>${item.cantidad}</span>
                    <button onclick="updateQty(${item.id},1)">+</button>
                </div>
                <div class="cci-price">$${fmt(item.subtotal)}</div>
                <button class="cci-del" onclick="removeFromCart(${item.id})">✕</button>
            </div>
        `).join('');
    }

    document.getElementById('cartTotal').textContent = '$' + fmt(total);
    document.getElementById('btnCheckout').disabled = catalogCart.length === 0;
}

// ===== PANEL CONTROL =====
function openCart() {
    renderCartItems();
    showView('cart');
    document.getElementById('cartPanel').classList.add('open');
    document.getElementById('cartOverlay').classList.add('show');
}

function closeCart() {
    document.getElementById('cartPanel').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('show');
}

function showView(view) {
    document.getElementById('viewCart').classList.toggle('hidden', view !== 'cart');
    document.getElementById('viewCheckout').classList.toggle('hidden', view !== 'checkout');
}

function goCheckout() {
    if (!catalogCart.length) return;
    showView('checkout');
    document.getElementById('resumenItems').innerHTML = catalogCart.map(i =>
        `<div class="order-item"><span>${escHtml(i.nombre)} x${i.cantidad}</span><strong>$${fmt(i.subtotal)}</strong></div>`
    ).join('');
    document.getElementById('resumenTotal').textContent = '$' + fmt(getTotal());
}

// ===== ENVIAR PEDIDO =====
async function enviarPedido(e) {
    e.preventDefault();
    const nombre    = document.getElementById('fNombre').value.trim();
    const telefono  = document.getElementById('fTelefono').value.trim();
    const direccion = document.getElementById('fDireccion').value.trim();
    const notas     = document.getElementById('fNotas').value.trim();

    if (!nombre || !telefono) {
        toast('Nombre y teléfono son obligatorios', '#e94560'); return;
    }

    const btn = document.getElementById('btnEnviar');
    btn.disabled = true;
    btn.textContent = 'Enviando pedido...';

    try {
        const res = await fetch('/catalogo/pedido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre, telefono, direccion, notas,
                total: getTotal(),
                items: catalogCart.map(i => ({
                    producto_id:    i.id,
                    cantidad:       i.cantidad,
                    precio_unitario: i.precio,
                    subtotal:       i.subtotal
                }))
            })
        });
        const data = await res.json();
        if (data.success) {
            catalogCart = [];
            saveCart();
            window.location.href = '/catalogo/confirmado/' + data.pedido_id;
        } else {
            toast('Error: ' + data.error, '#e94560');
            btn.disabled = false;
            btn.textContent = 'Confirmar Pedido';
        }
    } catch {
        toast('Error de conexión', '#e94560');
        btn.disabled = false;
        btn.textContent = 'Confirmar Pedido';
    }
}

// ===== FILTROS =====
function filterCat(cat, el) {
    activeFilter = cat;
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    applyFilters();
}

function applyFilters() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.prod-card').forEach(card => {
        const matchName = card.dataset.name.includes(q);
        const matchCat  = !activeFilter || card.dataset.cat === activeFilter;
        card.style.display = (matchName && matchCat) ? '' : 'none';
    });
    const grid   = document.getElementById('catGrid');
    const visible = [...document.querySelectorAll('.prod-card')].filter(c => c.style.display !== 'none');
    const noRes  = document.getElementById('noResults');
    if (noRes) noRes.style.display = visible.length ? 'none' : '';
}

// ===== HELPERS =====
function fmt(n) {
    return new Intl.NumberFormat('es-CO').format(Math.round(n));
}

function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function toast(msg, color = '#333') {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = `
        position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
        background:${color};color:#fff;padding:10px 20px;border-radius:20px;
        font-size:13px;font-weight:600;z-index:9999;white-space:nowrap;
        animation:fadeIn .2s;box-shadow:0 4px 12px rgba(0,0,0,.2)
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

// ===== INIT =====
document.getElementById('searchInput').addEventListener('input', applyFilters);
refreshBadge();
