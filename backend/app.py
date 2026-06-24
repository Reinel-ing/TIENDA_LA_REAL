from flask import Flask, jsonify, request, send_from_directory
from database import init_db, get_db
try:
    from flask_cors import CORS
    _has_cors = True
except ImportError:
    _has_cors = False
from datetime import datetime, date
import urllib.parse
import os
import hmac as _hmac, hashlib as _hashlib, time as _time

# Valores por defecto (se sobreescriben con los guardados en la DB)
_CONFIG_DEFAULTS = {
    'nombre':         'Tienda La Real',
    'whatsapp':       '',
    'ciudad':         '',
    'direccion':      '',
    'horario':        'Lun–Sáb 7am–9pm',
    'nequi':          '',
    'daviplata':      '',
    'bancolombia':    '',
    'url_tienda':     'https://tiendalarealco.pythonanywhere.com',
    'admin_password': 'admin123',
    'bono_activo':    '1',
    'bono_porcentaje':'10',
    'bono_texto':     '¡Bono de bienvenida! Descuento aplicado automáticamente en tu primera compra.',
    'domicilio_activo': '1',
    'domicilio_costo':  '1000',
}

def get_config():
    db = get_db()
    filas = db.execute("SELECT clave, valor FROM configuracion").fetchall()
    db.close()
    cfg = dict(_CONFIG_DEFAULTS)
    cfg.update({r['clave']: r['valor'] for r in filas})
    return cfg

# Alias global (se recarga en cada request via get_config())
TIENDA_CONFIG = _CONFIG_DEFAULTS

_here = os.path.dirname(os.path.abspath(__file__))
_parent_dist = os.path.join(_here, '..', 'frontend', 'dist')
_local_dist = os.path.join(_here, 'frontend', 'dist')
DIST = os.environ.get('DIST_PATH',
    _parent_dist if os.path.isdir(_parent_dist) else _local_dist)
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'tienda_la_real_2024')
if _has_cors:
    CORS(app, resources={r"/api/*": {"origins": "*"}})

# Auto-initialize DB tables on startup
with app.app_context():
    init_db()


# ── Servir React SPA ──────────────────────────────────────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    file_path = os.path.join(DIST, path)
    if path and os.path.isfile(file_path):
        return send_from_directory(DIST, path)
    return send_from_directory(DIST, 'index.html')


# ── Helpers ───────────────────────────────────────────────────────────────────
def rows(cur): return [dict(r) for r in cur.fetchall()]
def row(cur):  r = cur.fetchone(); return dict(r) if r else None

_PAGO_LABELS = {
    'nequi':       ('📱', 'Nequi'),
    'daviplata':   ('📱', 'Daviplata'),
    'bancolombia': ('🏦', 'Bancolombia'),
    'efectivo':    ('💵', 'Efectivo'),
}

def _pago_label(metodo):
    icon, label = _PAGO_LABELS.get(metodo, ('💳', metodo.capitalize()))
    return f"{icon} {label}"

def _entrega_label(tipo, direccion=''):
    if tipo == 'recoger':
        return '🏪 Retiro en tienda'
    return f"🛵 Domicilio{f': {direccion}' if direccion else ''}"



# ── Auth helpers ─────────────────────────────────────────────────────────────
def _make_token():
    ts = str(int(_time.time()))
    sig = _hmac.new(app.secret_key.encode(), ts.encode(), _hashlib.sha256).hexdigest()
    return f"{ts}.{sig}"

def _check_token(token):
    try:
        ts, sig = token.rsplit('.', 1)
        expected = _hmac.new(app.secret_key.encode(), ts.encode(), _hashlib.sha256).hexdigest()
        if not _hmac.compare_digest(sig, expected): return False
        return (int(_time.time()) - int(ts)) < 48 * 3600  # válido 48 h
    except: return False

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    password = data.get('password', '')
    db = get_db()
    stored = db.execute("SELECT valor FROM configuracion WHERE clave='admin_password'").fetchone()
    db.close()
    admin_pw = stored['valor'] if stored else 'admin123'
    if password != admin_pw:
        return jsonify({'ok': False, 'error': 'Contraseña incorrecta'}), 401
    return jsonify({'ok': True, 'token': _make_token()})

@app.route('/api/auth/check', methods=['POST'])
def api_auth_check():
    token = (request.get_json() or {}).get('token', '')
    return jsonify({'ok': _check_token(token)})


# ── Setup (one-time seed) ────────────────────────────────────────────────────
@app.route('/api/setup-seed')
def api_setup_seed():
    key = request.args.get('key', '')
    if key != 'tienda-setup-2024':
        return jsonify({'error': 'forbidden'}), 403
    import importlib.util, sys, io, contextlib
    seed_path = os.path.join(os.path.dirname(__file__), 'seed.py')
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            spec = importlib.util.spec_from_file_location('seed', seed_path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
        return jsonify({'ok': True, 'output': buf.getvalue()[-1000:]})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e), 'output': buf.getvalue()[-500:]})


# ── Config ────────────────────────────────────────────────────────────────────
@app.route('/api/config')
def api_config():
    return jsonify(get_config())

@app.route('/api/config', methods=['PUT'])
def api_config_update():
    data = request.get_json()
    db = get_db()
    for clave, valor in data.items():
        if clave in _CONFIG_DEFAULTS:
            db.execute("INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?,?)",
                       (clave, str(valor).strip()))
    db.commit(); db.close()
    return jsonify({'success': True, 'config': get_config()})


# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.route('/api/dashboard')
def api_dashboard():
    db = get_db()
    today = date.today().isoformat()
    mes = date.today().strftime('%Y-%m')

    vh = db.execute(
        "SELECT COUNT(*) c, COALESCE(SUM(total),0) t FROM ventas WHERE DATE(created_at)=?", (today,)
    ).fetchone()
    vm = db.execute(
        "SELECT COUNT(*) c, COALESCE(SUM(total),0) t FROM ventas WHERE strftime('%Y-%m',created_at)=?", (mes,)
    ).fetchone()

    ultimas = rows(db.execute("""
        SELECT v.id, v.total, v.tipo_pago, v.created_at,
               COALESCE(c.nombre,'Cliente General') as cliente
        FROM ventas v LEFT JOIN clientes c ON v.cliente_id=c.id
        ORDER BY v.created_at DESC LIMIT 5
    """))

    db.close()
    return jsonify({
        'ventas_hoy_count': vh['c'], 'ventas_hoy_total': vh['t'],
        'ventas_mes_count': vm['c'], 'ventas_mes_total': vm['t'],
        'total_productos': db.execute("SELECT COUNT(*) FROM productos").fetchone()[0]
            if False else get_db().execute("SELECT COUNT(*) FROM productos").fetchone()[0],
        'stock_bajo': get_db().execute("SELECT COUNT(*) FROM productos WHERE stock<=stock_minimo").fetchone()[0],
        'total_clientes': get_db().execute("SELECT COUNT(*) FROM clientes").fetchone()[0],
        'pedidos_pendientes': get_db().execute("SELECT COUNT(*) FROM pedidos WHERE estado='pendiente'").fetchone()[0],
        'ultimas_ventas': ultimas,
    })


# ── Inventario ────────────────────────────────────────────────────────────────
@app.route('/api/productos')
def api_productos_list():
    db = get_db()
    q   = request.args.get('q', '')
    cat = request.args.get('categoria', '')
    sql = "SELECT p.*, c.nombre as categoria_nombre FROM productos p LEFT JOIN categorias c ON p.categoria_id=c.id WHERE 1=1"
    params = []
    if q:
        sql += " AND (p.nombre LIKE ? OR p.codigo_barras LIKE ?)"; params += [f'%{q}%', f'%{q}%']
    if cat:
        sql += " AND p.categoria_id=?"; params.append(cat)
    sql += " ORDER BY p.nombre"
    data = rows(db.execute(sql, params))
    db.close()
    return jsonify(data)

@app.route('/api/productos/catalogo')
def api_productos_catalogo():
    db = get_db()
    data = rows(db.execute("""
        SELECT p.id, p.nombre, p.precio_venta, p.stock, p.descripcion, p.imagen, p.marca,
               c.nombre as categoria_nombre, c.id as categoria_id
        FROM productos p LEFT JOIN categorias c ON p.categoria_id=c.id
        ORDER BY p.nombre
    """))
    db.close()
    return jsonify(data)

@app.route('/api/catalogo/es-nuevo')
def api_es_nuevo():
    import re as _re
    tel = _re.sub(r'\D', '', request.args.get('telefono', ''))
    if len(tel) < 7:
        return jsonify({'nuevo': True})
    sufijo = tel[-10:]
    db = get_db()
    pedidos = db.execute(
        "SELECT cliente_telefono FROM pedidos WHERE estado != 'cancelado'"
    ).fetchall()
    for p in pedidos:
        tel_norm = _re.sub(r'\D', '', p['cliente_telefono'] or '')
        if len(tel_norm) >= 7 and tel_norm[-10:] == sufijo:
            db.close()
            return jsonify({'nuevo': False})
    db.close()
    return jsonify({'nuevo': True})

@app.route('/api/catalogo/registrar', methods=['POST'])
def api_catalogo_registrar():
    import re as _re
    d = request.get_json() or {}
    nombre   = d.get('nombre', '').strip()
    telefono = d.get('telefono', '').strip()
    if not nombre or not telefono:
        return jsonify({'error': 'Nombre y teléfono requeridos'}), 400
    digits = _re.sub(r'\D', '', telefono)
    db = get_db()
    if len(digits) >= 7:
        sufijo = digits[-10:]
        for c in rows(db.execute("SELECT * FROM clientes WHERE telefono != ''")):
            c_digits = _re.sub(r'\D', '', c.get('telefono', ''))
            if len(c_digits) >= 7 and c_digits[-10:] == sufijo:
                db.close()
                return jsonify({'cliente': dict(c), 'nuevo': False})
    cur = db.execute(
        "INSERT INTO clientes (nombre, telefono, direccion) VALUES (?, ?, ?)",
        (nombre, telefono, d.get('direccion', ''))
    )
    db.commit()
    c = row(db.execute("SELECT * FROM clientes WHERE id=?", (cur.lastrowid,)))
    db.close()
    return jsonify({'cliente': dict(c), 'nuevo': True}), 201

@app.route('/api/productos/scan')
def api_producto_scan():
    codigo = request.args.get('codigo', '').strip()
    if not codigo:
        return jsonify(None)
    db = get_db()
    p = row(db.execute(
        "SELECT p.*, c.nombre as categoria_nombre FROM productos p "
        "LEFT JOIN categorias c ON p.categoria_id=c.id WHERE p.codigo_barras=?",
        (codigo,)
    ))
    db.close()
    return jsonify(p)

@app.route('/api/productos/buscar')
def api_productos_buscar():
    db = get_db()
    q = request.args.get('q', '')
    cat = request.args.get('cat', '')
    sql = "SELECT id, nombre, precio_venta, stock, codigo_barras FROM productos WHERE stock>0"
    params = []
    if q:
        sql += " AND (nombre LIKE ? OR codigo_barras LIKE ?)"; params += [f'%{q}%', f'%{q}%']
    if cat:
        sql += " AND categoria_id=?"; params.append(cat)
    sql += " ORDER BY nombre LIMIT 100"
    data = rows(db.execute(sql, params))
    db.close()
    return jsonify(data)

@app.route('/api/productos', methods=['POST'])
def api_producto_crear():
    d  = request.get_json()
    db = get_db()
    try:
        cur = db.execute("""
            INSERT INTO productos (nombre,descripcion,precio_compra,precio_venta,stock,stock_minimo,categoria_id,codigo_barras,imagen,marca)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (d['nombre'], d.get('descripcion',''), float(d.get('precio_compra') or 0),
              float(d['precio_venta']), int(d.get('stock') or 0), int(d.get('stock_minimo') or 5),
              d.get('categoria_id') or None, d.get('codigo_barras',''), d.get('imagen',''), d.get('marca','')))
        db.commit()
        pid = cur.lastrowid
        prod = row(db.execute("SELECT p.*, c.nombre as categoria_nombre FROM productos p LEFT JOIN categorias c ON p.categoria_id=c.id WHERE p.id=?", (pid,)))
        db.close()
        return jsonify(prod), 201
    except Exception as e:
        db.rollback(); db.close()
        return jsonify({'error': str(e)}), 400

@app.route('/api/productos/<int:id>', methods=['PUT'])
def api_producto_editar(id):
    d  = request.get_json()
    db = get_db()
    try:
        db.execute("""
            UPDATE productos SET nombre=?,descripcion=?,precio_compra=?,precio_venta=?,
            stock=?,stock_minimo=?,categoria_id=?,codigo_barras=?,imagen=?,marca=? WHERE id=?
        """, (d['nombre'], d.get('descripcion',''), float(d.get('precio_compra') or 0),
              float(d['precio_venta']), int(d.get('stock') or 0), int(d.get('stock_minimo') or 5),
              d.get('categoria_id') or None, d.get('codigo_barras',''), d.get('imagen',''), d.get('marca',''), id))
        db.commit()
        prod = row(db.execute("SELECT p.*, c.nombre as categoria_nombre FROM productos p LEFT JOIN categorias c ON p.categoria_id=c.id WHERE p.id=?", (id,)))
        db.close()
        return jsonify(prod)
    except Exception as e:
        db.rollback(); db.close()
        return jsonify({'error': str(e)}), 400

@app.route('/api/productos/<int:id>', methods=['DELETE'])
def api_producto_eliminar(id):
    db = get_db()
    try:
        en_ventas  = db.execute("SELECT COUNT(*) FROM detalle_ventas  WHERE producto_id=?", (id,)).fetchone()[0]
        en_pedidos = db.execute("SELECT COUNT(*) FROM detalle_pedidos WHERE producto_id=?", (id,)).fetchone()[0]
        if en_ventas or en_pedidos:
            db.close()
            return jsonify({'error': 'Este producto tiene ventas o pedidos registrados y no puede eliminarse. Pon su stock en 0 para ocultarlo del catálogo.'}), 409
        db.execute("DELETE FROM productos WHERE id=?", (id,))
        db.commit(); db.close()
        return jsonify({'ok': True})
    except Exception as e:
        db.rollback(); db.close()
        return jsonify({'error': str(e)}), 400


# ── Categorias ────────────────────────────────────────────────────────────────
@app.route('/api/categorias')
def api_categorias():
    db = get_db()
    data = rows(db.execute("""
        SELECT c.*, COUNT(p.id) as total_productos
        FROM categorias c LEFT JOIN productos p ON c.id=p.categoria_id
        GROUP BY c.id ORDER BY c.nombre
    """))
    db.close()
    return jsonify(data)

@app.route('/api/categorias', methods=['POST'])
def api_categoria_crear():
    nombre = (request.get_json() or {}).get('nombre', '').strip()
    if not nombre:
        return jsonify({'error': 'Nombre requerido'}), 400
    db = get_db()
    try:
        cur = db.execute("INSERT INTO categorias (nombre) VALUES (?)", (nombre,))
        db.commit()
        cat = row(db.execute("SELECT c.*, COUNT(p.id) as total_productos FROM categorias c LEFT JOIN productos p ON c.id=p.categoria_id WHERE c.id=? GROUP BY c.id", (cur.lastrowid,)))
        db.close()
        return jsonify(cat), 201
    except Exception as e:
        db.rollback(); db.close()
        return jsonify({'error': 'Esa categoría ya existe'}), 409

@app.route('/api/categorias/<int:id>', methods=['PUT'])
def api_categoria_editar(id):
    nombre = (request.get_json() or {}).get('nombre', '').strip()
    if not nombre:
        return jsonify({'error': 'Nombre requerido'}), 400
    db = get_db()
    try:
        db.execute("UPDATE categorias SET nombre=? WHERE id=?", (nombre, id))
        db.commit()
        cat = row(db.execute("SELECT c.*, COUNT(p.id) as total_productos FROM categorias c LEFT JOIN productos p ON c.id=p.categoria_id WHERE c.id=? GROUP BY c.id", (id,)))
        db.close()
        return jsonify(cat)
    except Exception as e:
        db.rollback(); db.close()
        return jsonify({'error': 'Esa categoría ya existe'}), 409

@app.route('/api/categorias/<int:id>', methods=['DELETE'])
def api_categoria_eliminar(id):
    db = get_db()
    db.execute("UPDATE productos SET categoria_id=NULL WHERE categoria_id=?", (id,))
    db.execute("DELETE FROM categorias WHERE id=?", (id,))
    db.commit(); db.close()
    return jsonify({'ok': True})


# ── Ventas ────────────────────────────────────────────────────────────────────
@app.route('/api/ventas', methods=['POST'])
def api_venta_nueva():
    data = request.get_json()
    db   = get_db()
    try:
        cur = db.execute("""
            INSERT INTO ventas (cliente_id,total,tipo_pago,estado,created_at)
            VALUES (?,?,'completada',datetime('now','localtime'))
        """, (data.get('cliente_id') or None, data['total'], data['tipo_pago']))
        vid = cur.lastrowid
        for item in data['items']:
            db.execute("""
                INSERT INTO detalle_ventas (venta_id,producto_id,cantidad,precio_unitario,subtotal)
                VALUES (?,?,?,?,?)
            """, (vid, item['producto_id'], item['cantidad'], item['precio_unitario'], item['subtotal']))
            db.execute("UPDATE productos SET stock=stock-? WHERE id=?", (item['cantidad'], item['producto_id']))
        db.commit(); db.close()
        return jsonify({'success': True, 'venta_id': vid})
    except Exception as e:
        db.rollback(); db.close()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/ventas')
def api_ventas_historial():
    db = get_db()
    desde = request.args.get('desde', date.today().isoformat())
    hasta = request.args.get('hasta', date.today().isoformat())
    ventas = rows(db.execute("""
        SELECT v.id, v.total, v.tipo_pago, v.estado, v.created_at,
               COALESCE(c.nombre,'Cliente General') as cliente
        FROM ventas v LEFT JOIN clientes c ON v.cliente_id=c.id
        WHERE DATE(v.created_at) BETWEEN ? AND ? ORDER BY v.created_at DESC
    """, (desde, hasta)))
    total = db.execute("SELECT COALESCE(SUM(total),0) FROM ventas WHERE DATE(created_at) BETWEEN ? AND ?", (desde, hasta)).fetchone()[0]
    db.close()
    return jsonify({'ventas': ventas, 'total_periodo': total})

@app.route('/api/ventas/<int:id>')
def api_venta_detalle(id):
    db = get_db()
    v = row(db.execute("SELECT v.*, COALESCE(c.nombre,'Cliente General') as cliente FROM ventas v LEFT JOIN clientes c ON v.cliente_id=c.id WHERE v.id=?", (id,)))
    items = rows(db.execute("SELECT dv.*, p.nombre as producto_nombre FROM detalle_ventas dv JOIN productos p ON dv.producto_id=p.id WHERE dv.venta_id=?", (id,)))
    db.close()
    return jsonify({'venta': v, 'items': items})


# ── Clientes ──────────────────────────────────────────────────────────────────
@app.route('/api/clientes')
def api_clientes():
    db = get_db()
    q  = request.args.get('q', '')
    sql = "SELECT * FROM clientes WHERE 1=1"
    params = []
    if q:
        sql += " AND (nombre LIKE ? OR telefono LIKE ?)"; params += [f'%{q}%', f'%{q}%']
    data = rows(db.execute(sql + " ORDER BY nombre", params))
    db.close()
    return jsonify(data)

@app.route('/api/clientes', methods=['POST'])
def api_cliente_crear():
    d  = request.get_json()
    db = get_db()
    try:
        cur = db.execute("INSERT INTO clientes (nombre,telefono,email,direccion) VALUES (?,?,?,?)",
            (d['nombre'], d.get('telefono',''), d.get('email',''), d.get('direccion','')))
        db.commit()
        c = row(db.execute("SELECT * FROM clientes WHERE id=?", (cur.lastrowid,)))
        db.close()
        return jsonify(c), 201
    except Exception as e:
        db.rollback(); db.close()
        return jsonify({'error': str(e)}), 400

@app.route('/api/clientes/<int:id>', methods=['PUT'])
def api_cliente_editar(id):
    d  = request.get_json()
    db = get_db()
    db.execute("UPDATE clientes SET nombre=?,telefono=?,email=?,direccion=? WHERE id=?",
        (d['nombre'], d.get('telefono',''), d.get('email',''), d.get('direccion',''), id))
    db.commit()
    c = row(db.execute("SELECT * FROM clientes WHERE id=?", (id,)))
    db.close()
    return jsonify(c)

@app.route('/api/clientes/<int:id>', methods=['DELETE'])
def api_cliente_eliminar(id):
    db = get_db()
    db.execute("DELETE FROM clientes WHERE id=?", (id,))
    db.commit(); db.close()
    return jsonify({'ok': True})

@app.route('/api/suscriptores')
def api_suscriptores():
    """Clientes únicos que han hecho al menos un pedido (para difusión WhatsApp)."""
    db = get_db()
    # Clientes de pedidos WhatsApp
    wa = rows(db.execute("""
        SELECT cliente_nombre AS nombre, cliente_telefono AS telefono,
               COUNT(*) AS total_pedidos, MAX(created_at) AS ultimo_pedido,
               'whatsapp' AS origen
        FROM pedidos
        WHERE estado != 'cancelado' AND cliente_telefono != ''
        GROUP BY cliente_telefono
    """))
    # Clientes POS con teléfono
    pos = rows(db.execute("""
        SELECT c.nombre, c.telefono,
               COUNT(v.id) AS total_pedidos, MAX(v.created_at) AS ultimo_pedido,
               'pos' AS origen
        FROM clientes c
        JOIN ventas v ON v.cliente_id = c.id
        WHERE c.telefono != ''
        GROUP BY c.telefono
    """))
    db.close()
    # Unificar por últimos 10 dígitos del teléfono
    seen = {}
    for s in [*wa, *pos]:
        digits = ''.join(c for c in (s['telefono'] or '') if c.isdigit())[-10:]
        if digits and digits not in seen:
            seen[digits] = dict(s)
    result = sorted(seen.values(), key=lambda x: x['ultimo_pedido'] or '', reverse=True)
    return jsonify(result)


# ── Caja ──────────────────────────────────────────────────────────────────────
@app.route('/api/caja')
def api_caja():
    db = get_db()
    caja = row(db.execute("SELECT * FROM caja WHERE estado='abierta' ORDER BY fecha_apertura DESC LIMIT 1"))
    movimientos = []
    total_entradas = total_salidas = ventas_total = 0
    if caja:
        movimientos = rows(db.execute("SELECT * FROM movimientos_caja WHERE caja_id=? ORDER BY created_at DESC", (caja['id'],)))
        ventas_total = db.execute("SELECT COALESCE(SUM(total),0) FROM ventas WHERE DATE(created_at)>=DATE(?)", (caja['fecha_apertura'],)).fetchone()[0]
        total_entradas = sum(m['monto'] for m in movimientos if m['tipo']=='entrada') + ventas_total
        total_salidas  = sum(m['monto'] for m in movimientos if m['tipo']=='salida')
    db.close()
    return jsonify({'caja': caja, 'movimientos': movimientos,
                    'total_entradas': total_entradas, 'total_salidas': total_salidas,
                    'ventas_total': ventas_total})

@app.route('/api/caja/abrir', methods=['POST'])
def api_caja_abrir():
    d  = request.get_json()
    db = get_db()
    db.execute("INSERT INTO caja (fecha_apertura,monto_apertura,estado) VALUES (datetime('now','localtime'),?,'abierta')",
               (float(d.get('monto_apertura', 0)),))
    db.commit(); db.close()
    return jsonify({'ok': True})

@app.route('/api/caja/<int:id>/cerrar', methods=['POST'])
def api_caja_cerrar(id):
    d  = request.get_json()
    db = get_db()
    db.execute("UPDATE caja SET fecha_cierre=datetime('now','localtime'),monto_cierre=?,estado='cerrada' WHERE id=?",
               (float(d.get('monto_cierre', 0)), id))
    db.commit(); db.close()
    return jsonify({'ok': True})

@app.route('/api/caja/<int:caja_id>/movimiento', methods=['POST'])
def api_caja_movimiento(caja_id):
    d  = request.get_json()
    db = get_db()
    db.execute("INSERT INTO movimientos_caja (caja_id,tipo,monto,concepto,created_at) VALUES (?,?,?,?,datetime('now','localtime'))",
               (caja_id, d['tipo'], float(d['monto']), d.get('concepto','')))
    db.commit(); db.close()
    return jsonify({'ok': True})


# ── Reportes ──────────────────────────────────────────────────────────────────
@app.route('/api/reportes')
def api_reportes():
    db  = get_db()
    hoy = date.today().isoformat()
    mes = date.today().strftime('%Y-%m')

    sh = db.execute("SELECT COUNT(*) c, COALESCE(SUM(total),0) t FROM ventas WHERE DATE(created_at)=?", (hoy,)).fetchone()
    sm = db.execute("SELECT COUNT(*) c, COALESCE(SUM(total),0) t FROM ventas WHERE strftime('%Y-%m',created_at)=?", (mes,)).fetchone()

    top = rows(db.execute("""
        SELECT p.nombre, SUM(dv.cantidad) as total_vendido, SUM(dv.subtotal) as total_ingresos
        FROM detalle_ventas dv JOIN productos p ON dv.producto_id=p.id JOIN ventas v ON dv.venta_id=v.id
        WHERE strftime('%Y-%m',v.created_at)=? GROUP BY p.id ORDER BY total_vendido DESC LIMIT 8
    """, (mes,)))

    pago = rows(db.execute("SELECT tipo_pago, COUNT(*) cantidad, SUM(total) total FROM ventas WHERE strftime('%Y-%m',created_at)=? GROUP BY tipo_pago", (mes,)))

    semana = rows(db.execute("""
        SELECT DATE(created_at) as fecha, COALESCE(SUM(total),0) as total
        FROM ventas WHERE DATE(created_at)>=DATE('now','-6 days','localtime')
        GROUP BY DATE(created_at) ORDER BY fecha
    """))

    stock = rows(db.execute("SELECT nombre,stock,stock_minimo FROM productos WHERE stock<=stock_minimo ORDER BY stock LIMIT 10"))

    db.close()
    return jsonify({
        'stats_hoy': {'ventas': sh['c'], 'total': sh['t']},
        'stats_mes': {'ventas': sm['c'], 'total': sm['t']},
        'top_productos': top, 'por_tipo_pago': pago,
        'ventas_semana': semana, 'stock_bajo': stock,
    })


# ── Catálogo público ──────────────────────────────────────────────────────────
@app.route('/api/catalogo/pedido', methods=['POST'])
def api_catalogo_pedido():
    data = request.get_json()
    db   = get_db()
    tipo_entrega = data.get('tipo_entrega', 'domicilio')
    metodo_pago  = data.get('metodo_pago', 'efectivo')
    try:
        cur = db.execute("""
            INSERT INTO pedidos (cliente_nombre,cliente_telefono,cliente_direccion,total,notas,tipo_entrega,metodo_pago)
            VALUES (?,?,?,?,?,?,?)
        """, (data['nombre'], data['telefono'], data.get('direccion',''), data['total'],
              data.get('notas',''), tipo_entrega, metodo_pago))
        pid = cur.lastrowid
        for item in data['items']:
            db.execute("""
                INSERT INTO detalle_pedidos (pedido_id,producto_id,cantidad,precio_unitario,subtotal)
                VALUES (?,?,?,?,?)
            """, (pid, item['producto_id'], item['cantidad'], item['precio_unitario'], item['subtotal']))
        db.commit()

        cfg      = get_config()
        items_db = rows(db.execute("SELECT dp.*,p.nombre as producto_nombre FROM detalle_pedidos dp JOIN productos p ON dp.producto_id=p.id WHERE dp.pedido_id=?", (pid,)))
        lineas   = '\n'.join([f"  • {i['producto_nombre']} x{i['cantidad']} — ${i['subtotal']:,.0f}" for i in items_db])

        entrega_txt = _entrega_label(tipo_entrega, data.get('direccion',''))
        pago_txt    = _pago_label(metodo_pago)
        comprobante_txt = '\n📸 _Ahora te envío el comprobante de pago_' if metodo_pago != 'efectivo' else ''

        msg = (
            f"🛒 *PEDIDO #{pid}* — {cfg['nombre']}\n\n"
            f"👤 *{data['nombre']}*  |  📱 {data['telefono']}\n"
            f"{entrega_txt}\n\n"
            f"*Productos:*\n{lineas}\n\n"
            f"💰 *TOTAL: ${data['total']:,.0f}*\n"
            f"{pago_txt}"
            + (f"\n📝 {data['notas']}" if data.get('notas') else '')
            + comprobante_txt
        )
        wa_link = f"https://wa.me/{cfg['whatsapp']}?text={urllib.parse.quote(msg)}"

        db.close()
        return jsonify({'success': True, 'pedido_id': pid, 'wa_link': wa_link})
    except Exception as e:
        db.rollback(); db.close()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/catalogo/pedido/<int:id>')
def api_catalogo_pedido_detalle(id):
    db     = get_db()
    pedido = row(db.execute("SELECT * FROM pedidos WHERE id=?", (id,)))
    items  = rows(db.execute("SELECT dp.*,p.nombre as producto_nombre FROM detalle_pedidos dp JOIN productos p ON dp.producto_id=p.id WHERE dp.pedido_id=?", (id,)))

    if not pedido:
        db.close(); return jsonify({'error': 'No encontrado'}), 404

    cfg          = get_config()
    tipo_entrega = pedido.get('tipo_entrega', 'domicilio')
    metodo_pago  = pedido.get('metodo_pago', 'efectivo')
    lineas       = '\n'.join([f"  • {i['producto_nombre']} x{i['cantidad']} — ${i['subtotal']:,.0f}" for i in items])
    entrega_txt  = _entrega_label(tipo_entrega, pedido.get('cliente_direccion',''))
    pago_txt     = _pago_label(metodo_pago)
    comprobante_txt = '\n📸 _Ahora te envío el comprobante de pago_' if metodo_pago != 'efectivo' else ''

    msg = (
        f"🛒 *PEDIDO #{id}* — {cfg['nombre']}\n\n"
        f"👤 *{pedido['cliente_nombre']}*  |  📱 {pedido['cliente_telefono']}\n"
        f"{entrega_txt}\n\n"
        f"*Productos:*\n{lineas}\n\n"
        f"💰 *TOTAL: ${pedido['total']:,.0f}*\n"
        f"{pago_txt}"
        + (f"\n📝 {pedido['notas']}" if pedido.get('notas') else '')
        + comprobante_txt
    )
    wa_link = f"https://wa.me/{cfg['whatsapp']}?text={urllib.parse.quote(msg)}"

    db.close()
    return jsonify({'pedido': pedido, 'items': items, 'wa_link': wa_link, 'config': cfg})


# ── Pedidos (admin) ───────────────────────────────────────────────────────────
@app.route('/api/pedidos')
def api_pedidos():
    db = get_db()
    estado = request.args.get('estado', 'pendiente')
    # Tab "en_camino" cubre tanto en_camino como listo (pickup)
    if estado == 'en_camino':
        where_clause = "p.estado IN ('en_camino','listo')"
        params = []
    else:
        where_clause = "p.estado=?"
        params = [estado]
    lista = rows(db.execute(f"""
        SELECT p.id, p.cliente_nombre, p.cliente_telefono, p.cliente_direccion,
               p.total, p.estado, p.notas, p.created_at, p.pago_verificado,
               p.tipo_entrega, p.metodo_pago,
               CASE WHEN p.comprobante_b64 != '' AND p.comprobante_b64 IS NOT NULL THEN 1 ELSE 0 END as tiene_comprobante,
               COUNT(dp.id) as num_items
        FROM pedidos p LEFT JOIN detalle_pedidos dp ON p.id=dp.pedido_id
        WHERE {where_clause} GROUP BY p.id ORDER BY p.created_at DESC
    """, params))
    conteos_raw = {r['estado']: r['n'] for r in rows(db.execute("SELECT estado, COUNT(*) n FROM pedidos GROUP BY estado"))}
    conteos = dict(conteos_raw)
    conteos['en_camino'] = conteos_raw.get('en_camino', 0) + conteos_raw.get('listo', 0)
    db.close()
    return jsonify({'pedidos': lista, 'conteos': conteos})

@app.route('/api/pedidos/<int:id>')
def api_pedido_detalle(id):
    db     = get_db()
    pedido = row(db.execute("SELECT * FROM pedidos WHERE id=?", (id,)))
    items  = rows(db.execute("SELECT dp.*,p.nombre as producto_nombre,p.stock as stock_actual FROM detalle_pedidos dp JOIN productos p ON dp.producto_id=p.id WHERE dp.pedido_id=?", (id,)))
    db.close()
    return jsonify({'pedido': pedido, 'items': items})

@app.route('/api/pedidos/<int:id>/confirmar', methods=['POST'])
def api_pedido_confirmar(id):
    db = get_db()
    try:
        pedido = row(db.execute("SELECT * FROM pedidos WHERE id=?", (id,)))
        items  = rows(db.execute("SELECT dp.*,p.stock FROM detalle_pedidos dp JOIN productos p ON dp.producto_id=p.id WHERE dp.pedido_id=?", (id,)))
        if any(i['cantidad'] > i['stock'] for i in items):
            db.close(); return jsonify({'success': False, 'error': 'Stock insuficiente'}), 400

        cur = db.execute("INSERT INTO ventas (total,tipo_pago,estado,created_at) VALUES (?,'pendiente_cobro','completada',datetime('now','localtime'))", (pedido['total'],))
        vid = cur.lastrowid
        for i in items:
            db.execute("INSERT INTO detalle_ventas (venta_id,producto_id,cantidad,precio_unitario,subtotal) VALUES (?,?,?,?,?)",
                       (vid, i['producto_id'], i['cantidad'], i['precio_unitario'], i['subtotal']))
            db.execute("UPDATE productos SET stock=stock-? WHERE id=?", (i['cantidad'], i['producto_id']))
        db.execute("UPDATE pedidos SET estado='confirmado',venta_id=? WHERE id=?", (vid, id))

        cfg         = get_config()
        items_conf  = rows(db.execute("SELECT dp.*,p.nombre as producto_nombre FROM detalle_pedidos dp JOIN productos p ON dp.producto_id=p.id WHERE dp.pedido_id=?", (id,)))
        lineas_conf = '\n'.join([f"  • {i['producto_nombre']} x{i['cantidad']} — ${i['subtotal']:,.0f}" for i in items_conf])
        factura_url = f"{cfg.get('url_tienda','').rstrip('/')}/factura/{id}"
        nombre_corto = pedido['cliente_nombre'].split()[0]
        entrega_line = _entrega_label(pedido.get('tipo_entrega','domicilio'), pedido.get('cliente_direccion',''))

        msg = (
            f"✅ *¡Pedido #{id} confirmado!*\n\n"
            f"Hola *{nombre_corto}* 👋 Tu pedido en *{cfg['nombre']}* está confirmado y siendo preparado.\n\n"
            f"*Tu pedido:*\n{lineas_conf}\n\n"
            f"💰 *Total: ${pedido['total']:,.0f}*\n"
            f"{entrega_line}\n\n"
            f"📄 *Tu factura:*\n{factura_url}\n\n"
            f"¡Gracias por tu compra! 🙏 *{cfg['nombre']}*"
        )
        wa = None
        if pedido.get('cliente_telefono'):
            tel = pedido['cliente_telefono'].replace(' ','').replace('+','')
            wa  = f"https://wa.me/{tel}?text={urllib.parse.quote(msg)}"

        db.commit(); db.close()
        return jsonify({'success': True, 'venta_id': vid, 'wa_cliente': wa})
    except Exception as e:
        db.rollback(); db.close()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/pedidos/<int:id>/cancelar', methods=['POST'])
def api_pedido_cancelar(id):
    db = get_db()
    db.execute("UPDATE pedidos SET estado='cancelado' WHERE id=?", (id,))
    db.commit(); db.close()
    return jsonify({'success': True})

@app.route('/api/catalogo/pedido/<int:id>/cancelar', methods=['POST'])
def api_catalogo_pedido_cancelar(id):
    """El cliente cancela su propio pedido (solo si aún no salió)."""
    db = get_db()
    pedido = row(db.execute("SELECT * FROM pedidos WHERE id=?", (id,)))
    if not pedido:
        db.close(); return jsonify({'error': 'Pedido no encontrado'}), 404
    estado = pedido.get('estado', 'pendiente')
    if estado in ('en_camino', 'listo', 'entregado'):
        db.close()
        return jsonify({'error': 'Tu pedido ya está en proceso de entrega y no se puede cancelar. Comunícate con la tienda.'}), 409
    if estado == 'cancelado':
        db.close()
        return jsonify({'success': True, 'nuevo_estado': 'cancelado'})
    db.execute("UPDATE pedidos SET estado='cancelado' WHERE id=?", (id,))
    cfg = get_config()
    wa = None
    if cfg.get('whatsapp'):
        nombre_corto = pedido['cliente_nombre'].split()[0]
        msg = (
            f"❌ *Pedido #{id} cancelado*\n\n"
            f"Hola, soy *{nombre_corto}*. Acabo de cancelar mi pedido #{id} desde el catálogo.\n\n"
            f"Total que era: *${pedido['total']:,.0f}*"
        )
        tel = cfg['whatsapp'].replace(' ', '').replace('+', '')
        wa = f"https://wa.me/{tel}?text={urllib.parse.quote(msg)}"
    db.commit(); db.close()
    return jsonify({'success': True, 'nuevo_estado': 'cancelado', 'wa_tienda': wa})

@app.route('/api/pedidos/<int:id>/avanzar', methods=['POST'])
def api_pedido_avanzar(id):
    db = get_db()
    pedido = row(db.execute("SELECT * FROM pedidos WHERE id=?", (id,)))
    if not pedido:
        db.close(); return jsonify({'error': 'No encontrado'}), 404
    estado_actual = pedido.get('estado', 'pendiente')
    tipo_entrega  = pedido.get('tipo_entrega', 'domicilio')
    siguiente = {
        'confirmado': 'en_camino' if tipo_entrega == 'domicilio' else 'listo',
        'en_camino':  'entregado',
        'listo':      'entregado',
    }.get(estado_actual)
    if not siguiente:
        db.close(); return jsonify({'error': f'No se puede avanzar desde {estado_actual}'}), 400
    db.execute("UPDATE pedidos SET estado=? WHERE id=?", (siguiente, id))
    cfg = get_config()
    nombre_corto = pedido['cliente_nombre'].split()[0]
    msgs = {
        'en_camino': (
            f"🛵 *¡Tu pedido #{id} ya salió!*\n\n"
            f"Hola *{nombre_corto}* 👋 Tu pedido está en camino a tu dirección.\n\n"
            f"Prepara *${pedido['total']:,.0f}* para el pago al recibir.\n\n"
            f"¡Gracias por comprar en *{cfg['nombre']}*! 🙏"
        ),
        'listo': (
            f"🏪 *¡Tu pedido #{id} está listo!*\n\n"
            f"Hola *{nombre_corto}* 👋 Tu pedido ya está listo para recoger.\n\n"
            f"Ven cuando quieras. Total: *${pedido['total']:,.0f}*\n\n"
            f"¡Te esperamos en *{cfg['nombre']}*! 🙏"
        ),
        'entregado': (
            f"✅ *¡Pedido #{id} entregado!*\n\n"
            f"Hola *{nombre_corto}* 👋 Tu pedido fue entregado con éxito.\n\n"
            f"¡Gracias por comprar en *{cfg['nombre']}*! Esperamos verte pronto ❤️"
        ),
    }
    wa = None
    if pedido.get('cliente_telefono') and siguiente in msgs:
        tel = pedido['cliente_telefono'].replace(' ','').replace('+','')
        wa  = f"https://wa.me/{tel}?text={urllib.parse.quote(msgs[siguiente])}"
    db.commit(); db.close()
    return jsonify({'success': True, 'nuevo_estado': siguiente, 'wa_cliente': wa})

@app.route('/api/pedidos/<int:id>/comprobante', methods=['POST'])
def api_pedido_comprobante(id):
    data = request.get_json()
    b64 = data.get('imagen', '')
    if not b64 or not b64.startswith('data:image'):
        return jsonify({'error': 'Imagen inválida'}), 400
    db = get_db()
    db.execute("UPDATE pedidos SET comprobante_b64=? WHERE id=?", (b64, id))
    db.commit(); db.close()
    return jsonify({'success': True})

@app.route('/api/pedidos/<int:id>/verificar-pago', methods=['POST'])
def api_pedido_verificar_pago(id):
    db = get_db()
    db.execute("UPDATE pedidos SET pago_verificado=1 WHERE id=?", (id,))
    db.commit(); db.close()
    return jsonify({'success': True})

@app.route('/api/pedidos/<int:id>/comprobante-img')
def api_pedido_comprobante_img(id):
    db = get_db()
    pedido = row(db.execute("SELECT comprobante_b64 FROM pedidos WHERE id=?", (id,)))
    db.close()
    if not pedido or not pedido.get('comprobante_b64'):
        return jsonify({'error': 'No hay comprobante'}), 404
    return jsonify({'imagen': pedido['comprobante_b64']})

@app.route('/api/transferencias')
def api_transferencias():
    db = get_db()
    fecha_ini = request.args.get('desde', '')
    fecha_fin = request.args.get('hasta', '')

    # Ventas del POS pagadas por medios digitales
    where_v = "WHERE v.tipo_pago != 'efectivo'"
    params_v = []
    if fecha_ini: where_v += " AND DATE(v.created_at) >= ?"; params_v.append(fecha_ini)
    if fecha_fin: where_v += " AND DATE(v.created_at) <= ?"; params_v.append(fecha_fin)

    ventas_dig = rows(db.execute(f"""
        SELECT v.id, v.total, v.tipo_pago, v.created_at,
               COALESCE(c.nombre,'—') as cliente,
               COUNT(dv.id) as num_items, 'venta' as origen
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN detalle_ventas dv ON v.id = dv.venta_id
        {where_v}
        GROUP BY v.id ORDER BY v.created_at DESC
    """, params_v))

    # Pedidos WhatsApp confirmados con comprobante
    where_p = "WHERE p.estado != 'cancelado' AND p.comprobante_b64 != '' AND p.comprobante_b64 IS NOT NULL"
    params_p = []
    if fecha_ini: where_p += " AND DATE(p.created_at) >= ?"; params_p.append(fecha_ini)
    if fecha_fin: where_p += " AND DATE(p.created_at) <= ?"; params_p.append(fecha_fin)

    pedidos_dig = rows(db.execute(f"""
        SELECT p.id, p.total, 'whatsapp' as tipo_pago, p.created_at,
               p.cliente_nombre as cliente, p.pago_verificado,
               COUNT(dp.id) as num_items, 'pedido' as origen
        FROM pedidos p
        LEFT JOIN detalle_pedidos dp ON p.id = dp.pedido_id
        {where_p}
        GROUP BY p.id ORDER BY p.created_at DESC
    """, params_p))

    # Totales por método
    todos = ventas_dig + pedidos_dig
    resumen = {}
    for t in todos:
        m = t['tipo_pago']
        resumen[m] = resumen.get(m, 0) + t['total']

    db.close()
    return jsonify({
        'ventas': ventas_dig,
        'pedidos': pedidos_dig,
        'resumen': resumen,
        'gran_total': sum(resumen.values()),
    })


@app.route('/api/factura/<int:id>')
def api_factura(id):
    db     = get_db()
    pedido = row(db.execute("SELECT * FROM pedidos WHERE id=?", (id,)))
    items  = rows(db.execute("SELECT dp.*,p.nombre as producto_nombre FROM detalle_pedidos dp JOIN productos p ON dp.producto_id=p.id WHERE dp.pedido_id=?", (id,)))
    db.close()
    if not pedido: return jsonify({'error': 'No encontrado'}), 404
    return jsonify({'pedido': pedido, 'items': items, 'config': get_config()})


@app.route('/api/ventas/<int:id>/recibo')
def api_venta_recibo(id):
    db    = get_db()
    venta = row(db.execute("""
        SELECT v.*, COALESCE(c.nombre,'Cliente General') as cliente_nombre
        FROM ventas v LEFT JOIN clientes c ON v.cliente_id=c.id WHERE v.id=?
    """, (id,)))
    items = rows(db.execute("""
        SELECT dv.*, p.nombre as producto_nombre
        FROM detalle_ventas dv JOIN productos p ON dv.producto_id=p.id WHERE dv.venta_id=?
    """, (id,)))
    db.close()
    if not venta: return jsonify({'error': 'No encontrado'}), 404
    return jsonify({'venta': venta, 'items': items, 'config': get_config()})


# ── Promociones ───────────────────────────────────────────────────────────────
@app.route('/api/promociones')
def api_promociones():
    db = get_db()
    admin = request.args.get('admin') == '1'
    where = '' if admin else 'WHERE activo=1'
    data = rows(db.execute(f'SELECT * FROM promociones {where} ORDER BY orden, id'))
    db.close()
    return jsonify(data)

@app.route('/api/promociones', methods=['POST'])
def api_promocion_crear():
    d = request.get_json()
    db = get_db()
    cur = db.execute(
        'INSERT INTO promociones (titulo,descripcion,color_fondo,color_texto,imagen,activo,orden) VALUES (?,?,?,?,?,?,?)',
        (d.get('titulo',''), d.get('descripcion',''), d.get('color_fondo','#1e40af'),
         d.get('color_texto','#ffffff'), d.get('imagen',''), int(d.get('activo',1)), int(d.get('orden',0)))
    )
    db.commit()
    p = row(db.execute('SELECT * FROM promociones WHERE id=?', (cur.lastrowid,)))
    db.close()
    return jsonify(p), 201

@app.route('/api/promociones/<int:pid>', methods=['PUT'])
def api_promocion_editar(pid):
    d = request.get_json()
    db = get_db()
    db.execute(
        'UPDATE promociones SET titulo=?,descripcion=?,color_fondo=?,color_texto=?,imagen=?,activo=?,orden=? WHERE id=?',
        (d.get('titulo',''), d.get('descripcion',''), d.get('color_fondo','#1e40af'),
         d.get('color_texto','#ffffff'), d.get('imagen',''), int(d.get('activo',1)), int(d.get('orden',0)), pid)
    )
    db.commit()
    p = row(db.execute('SELECT * FROM promociones WHERE id=?', (pid,)))
    db.close()
    return jsonify(p)

@app.route('/api/promociones/<int:pid>', methods=['DELETE'])
def api_promocion_eliminar(pid):
    db = get_db()
    db.execute('DELETE FROM promociones WHERE id=?', (pid,))
    db.commit(); db.close()
    return jsonify({'ok': True})


@app.route('/api/reset-datos', methods=['DELETE'])
def api_reset_datos():
    body = request.get_json(silent=True, force=True) or {}
    if body.get('confirmar') != 'BORRAR-TODO':
        return jsonify({'error': 'Confirmación incorrecta'}), 400
    db = get_db()
    db.executescript("""
        PRAGMA foreign_keys = OFF;
        DELETE FROM detalle_ventas;
        DELETE FROM detalle_pedidos;
        DELETE FROM movimientos_caja;
        DELETE FROM ventas;
        DELETE FROM pedidos;
        DELETE FROM caja;
        DELETE FROM clientes;
        DELETE FROM productos;
        DELETE FROM categorias;
        DELETE FROM sqlite_sequence WHERE name IN
            ('ventas','detalle_ventas','pedidos','detalle_pedidos',
             'movimientos_caja','caja','clientes','productos','categorias');
        INSERT INTO categorias (nombre) VALUES
            ('Bebidas'),('Lácteos'),('Panadería'),('Aseo'),
            ('Granos'),('Snacks'),('Carnes'),('Otros');
        PRAGMA foreign_keys = ON;
    """)
    db.commit(); db.close()
    return jsonify({'success': True})


if __name__ == '__main__':
    init_db()
    print("\n  [OK] API lista en http://localhost:5000")
    print("  [OK] React dev: cd frontend && npm run dev\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
