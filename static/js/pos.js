// ====== STATE ======
let cart = [];
let allProducts = [];
let activeCat  = '';

// ====== LOAD PRODUCTS ======
async function loadProducts(q = '', cat = '') {
    const params = new URLSearchParams({ q, cat });
    const res    = await fetch('/api/productos?' + params);
    allProducts  = await res.json();
    renderProducts(allProducts);
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!products.length) {
        grid.innerHTML = '<div class="no-results"><i class="fas fa-search fa-2x mb-2"></i><br>Sin resultados</div>';
        return;
    }
    grid.innerHTML = products.map(p => `
        <div class="product-card ${p.stock <= 0 ? 'out-of-stock' : ''}"
             onclick="${p.stock > 0 ? `addToCart(${JSON.stringify(p).replace(/"/g,"'")})` : ''}">
            <div class="p-name">${escHtml(p.nombre)}</div>
            <div class="p-price">$${formatMoney(p.precio_venta)}</div>
            <div class="p-stock">
                <span class="badge ${p.stock > 5 ? 'badge-ok' : p.stock > 0 ? 'badge-low' : 'badge-out'}">
                    ${p.stock > 0 ? p.stock + ' und' : 'Agotado'}
                </span>
            </div>
        </div>
    `).join('');
}

// ====== CART LOGIC ======
function addToCart(p) {
    const idx = cart.findIndex(i => i.producto_id === p.id);
    if (idx >= 0) {
        if (cart[idx].cantidad >= p.stock) { showToast('Sin stock suficiente', 'warning'); return; }
        cart[idx].cantidad++;
        cart[idx].subtotal = cart[idx].cantidad * cart[idx].precio_unitario;
    } else {
        cart.push({
            producto_id:    p.id,
            nombre:         p.nombre,
            precio_unitario: p.precio_venta,
            cantidad:       1,
            subtotal:       p.precio_venta,
            stock:          p.stock
        });
    }
    renderCart();
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    renderCart();
}

function updateQty(idx, delta) {
    const item = cart[idx];
    const nq   = item.cantidad + delta;
    if (nq <= 0)          { removeFromCart(idx); return; }
    if (nq > item.stock)  { showToast('Sin stock suficiente', 'warning'); return; }
    item.cantidad = nq;
    item.subtotal = nq * item.precio_unitario;
    renderCart();
}

function clearCart() {
    if (cart.length && !confirm('¿Vaciar el carrito?')) return;
    cart = [];
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const total     = cart.reduce((s, i) => s + i.subtotal, 0);

    if (!cart.length) {
        container.innerHTML = '<div class="cart-empty"><i class="fas fa-shopping-cart fa-2x mb-2"></i><br>Carrito vacío<br><small>Haz clic en un producto para agregarlo</small></div>';
    } else {
        container.innerHTML = cart.map((item, i) => `
            <div class="cart-row">
                <div class="c-name">${escHtml(item.nombre)}</div>
                <div class="c-qty">
                    <button class="btn btn-outline-secondary btn-sm" onclick="updateQty(${i},-1)">−</button>
                    <span>${item.cantidad}</span>
                    <button class="btn btn-outline-secondary btn-sm" onclick="updateQty(${i},1)">+</button>
                </div>
                <div class="c-sub">$${formatMoney(item.subtotal)}</div>
                <button class="btn btn-link c-del p-0" onclick="removeFromCart(${i})"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }

    document.getElementById('cartCount').textContent = cart.reduce((s, i) => s + i.cantidad, 0);
    document.getElementById('totalAmount').textContent = '$' + formatMoney(total);
    updateChange();
}

// ====== PAYMENT ======
function updateChange() {
    const total    = cart.reduce((s, i) => s + i.subtotal, 0);
    const recibido = parseFloat(document.getElementById('montoRecibido').value) || 0;
    const cambio   = recibido - total;
    const el       = document.getElementById('cambioAmount');
    if (!el) return;
    el.textContent = recibido > 0 ? (cambio >= 0 ? '$' + formatMoney(cambio) : 'Falta $' + formatMoney(-cambio)) : '—';
    el.className   = 'fw-bold ' + (cambio >= 0 ? 'text-success' : 'text-danger');
}

function tipoPagoChange() {
    const tipo  = document.getElementById('tipoPago').value;
    const block = document.getElementById('efectivoBlock');
    if (block) block.style.display = tipo === 'efectivo' ? '' : 'none';
}

async function finalizarVenta() {
    if (!cart.length) { showToast('El carrito está vacío', 'warning'); return; }

    const total     = cart.reduce((s, i) => s + i.subtotal, 0);
    const tipoPago  = document.getElementById('tipoPago').value;
    const clienteId = document.getElementById('clienteId').value;
    const recibido  = parseFloat(document.getElementById('montoRecibido').value) || 0;

    if (tipoPago === 'efectivo' && recibido < total) {
        showToast('El monto recibido es menor al total', 'danger'); return;
    }

    const btn = document.getElementById('btnCobrar');
    btn.disabled    = true;
    btn.innerHTML   = '<i class="fas fa-spinner fa-spin me-2"></i>Procesando...';

    try {
        const res  = await fetch('/ventas/nueva', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ items: cart, total, tipo_pago: tipoPago, cliente_id: clienteId || null })
        });
        const data = await res.json();
        if (data.success) {
            mostrarRecibo(data.venta_id, total, tipoPago, recibido);
            cart = [];
            renderCart();
            loadProducts(document.getElementById('searchInput').value, activeCat);
        } else {
            showToast('Error: ' + data.error, 'danger');
        }
    } catch (e) {
        showToast('Error de conexión', 'danger');
    }
    btn.disabled  = false;
    btn.innerHTML = '<i class="fas fa-check me-2"></i>Cobrar';
}

function mostrarRecibo(ventaId, total, tipoPago, recibido) {
    document.getElementById('r-id').textContent    = '#' + ventaId;
    document.getElementById('r-total').textContent = '$' + formatMoney(total);
    document.getElementById('r-pago').textContent  = tipoPago.charAt(0).toUpperCase() + tipoPago.slice(1);
    document.getElementById('r-rec').textContent   = '$' + formatMoney(recibido);
    document.getElementById('r-cam').textContent   = '$' + formatMoney(Math.max(0, recibido - total));
    document.getElementById('r-fecha').textContent = new Date().toLocaleString('es-CO');
    new bootstrap.Modal(document.getElementById('reciboModal')).show();
}

// ====== CATEGORY FILTER ======
function filterCat(cat, btn) {
    activeCat = cat;
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadProducts(document.getElementById('searchInput').value, cat);
}

// ====== HELPERS ======
function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed shadow`;
    toast.style.cssText = 'top:70px;right:20px;z-index:9999;min-width:250px';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ====== KEYBOARD SHORTCUTS ======
document.addEventListener('keydown', function (e) {
    if (e.key === 'F2') { e.preventDefault(); document.getElementById('searchInput').focus(); }
    if (e.key === 'F12') { e.preventDefault(); finalizarVenta(); }
    if (e.key === 'Escape') { document.getElementById('searchInput').value = ''; loadProducts('', activeCat); }
});

// ====== INIT ======
document.getElementById('searchInput').addEventListener('input', function () {
    loadProducts(this.value, activeCat);
});

document.getElementById('montoRecibido').addEventListener('input', updateChange);
document.getElementById('tipoPago').addEventListener('change', tipoPagoChange);

loadProducts();
