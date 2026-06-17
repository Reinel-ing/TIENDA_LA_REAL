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

# =====================================================
# CONFIGURACION DE LA TIENDA  ← EDITA AQUI
# =====================================================
TIENDA_CONFIG = {
    'nombre':    'Tienda La Real',
    'whatsapp':  '573000000000',
    'ciudad':    'Tu Ciudad',
    'direccion': 'Tu Dirección',
    'horario':   'Lun–Sáb 7am–9pm',
}
# =====================================================

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
    return jsonify(TIENDA_CONFIG)


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
        SELECT p.id, p.nombre, p.precio_venta, p.stock, p.descripcion,
               c.nombre as categoria_nombre, c.id as categoria_id
        FROM productos p LEFT JOIN categorias c ON p.categoria_id=c.id
        ORDER BY p.nombre
    """))
    db.close()
    return jsonify(data)

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
            INSERT INTO productos (nombre,descripcion,precio_compra,precio_venta,stock,stock_minimo,categoria_id,codigo_barras)
            VALUES (?,?,?,?,?,?,?,?)
        """, (d['nombre'], d.get('descripcion',''), float(d.get('precio_compra') or 0),
              float(d['precio_venta']), int(d.get('stock') or 0), int(d.get('stock_minimo') or 5),
              d.get('categoria_id') or None, d.get('codigo_barras','')))
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
            stock=?,stock_minimo=?,categoria_id=?,codigo_barras=? WHERE id=?
        """, (d['nombre'], d.get('descripcion',''), float(d.get('precio_compra') or 0),
              float(d['precio_venta']), int(d.get('stock') or 0), int(d.get('stock_minimo') or 5),
              d.get('categoria_id') or None, d.get('codigo_barras',''), id))
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
    db.execute("DELETE FROM productos WHERE id=?", (id,))
    db.commit(); db.close()
    return jsonify({'ok': True})


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
    try:
        cur = db.execute("""
            INSERT INTO pedidos (cliente_nombre,cliente_telefono,cliente_direccion,total,notas)
            VALUES (?,?,?,?,?)
        """, (data['nombre'], data['telefono'], data.get('direccion',''), data['total'], data.get('notas','')))
        pid = cur.lastrowid
        for item in data['items']:
            db.execute("""
                INSERT INTO detalle_pedidos (pedido_id,producto_id,cantidad,precio_unitario,subtotal)
                VALUES (?,?,?,?,?)
            """, (pid, item['producto_id'], item['cantidad'], item['precio_unitario'], item['subtotal']))
        db.commit()

        # Generar link WhatsApp
        pedido_db = row(db.execute("SELECT * FROM pedidos WHERE id=?", (pid,)))
        items_db  = rows(db.execute("SELECT dp.*,p.nombre as producto_nombre FROM detalle_pedidos dp JOIN productos p ON dp.producto_id=p.id WHERE dp.pedido_id=?", (pid,)))
        lineas = '\n'.join([f"• {i['producto_nombre']} x{i['cantidad']} = ${i['subtotal']:,.0f}" for i in items_db])
        msg = (f"Hola *{TIENDA_CONFIG['nombre']}*! 🛒\n\nQuiero hacer este pedido:\n\n"
               f"*Pedido #{pid}*\n{lineas}\n\n💰 *TOTAL: ${data['total']:,.0f}*\n\n"
               f"📋 *Mis datos:*\nNombre: {data['nombre']}\nTel: {data['telefono']}\n"
               + (f"Dirección: {data.get('direccion','')}\n" if data.get('direccion') else "")
               + (f"Notas: {data.get('notas','')}\n" if data.get('notas') else "")
               + "\n_Confirmen disponibilidad por favor_ 🙏")
        wa_link = f"https://wa.me/{TIENDA_CONFIG['whatsapp']}?text={urllib.parse.quote(msg)}"

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

    lineas = '\n'.join([f"• {i['producto_nombre']} x{i['cantidad']} = ${i['subtotal']:,.0f}" for i in items])
    msg = (f"Hola *{TIENDA_CONFIG['nombre']}*! 🛒\n\nQuiero hacer este pedido:\n\n"
           f"*Pedido #{id}*\n{lineas}\n\n💰 *TOTAL: ${pedido['total']:,.0f}*\n\n"
           f"📋 *Mis datos:*\nNombre: {pedido['cliente_nombre']}\nTel: {pedido['cliente_telefono']}\n"
           + (f"Dirección: {pedido['cliente_direccion']}\n" if pedido.get('cliente_direccion') else "")
           + (f"Notas: {pedido['notas']}\n" if pedido.get('notas') else "")
           + "\n_Confirmen disponibilidad por favor_ 🙏")
    wa_link = f"https://wa.me/{TIENDA_CONFIG['whatsapp']}?text={urllib.parse.quote(msg)}"

    db.close()
    return jsonify({'pedido': pedido, 'items': items, 'wa_link': wa_link, 'config': TIENDA_CONFIG})


# ── Pedidos (admin) ───────────────────────────────────────────────────────────
@app.route('/api/pedidos')
def api_pedidos():
    db = get_db()
    estado = request.args.get('estado', 'pendiente')
    lista  = rows(db.execute("""
        SELECT p.*, COUNT(dp.id) as num_items
        FROM pedidos p LEFT JOIN detalle_pedidos dp ON p.id=dp.pedido_id
        WHERE p.estado=? GROUP BY p.id ORDER BY p.created_at DESC
    """, (estado,)))
    conteos = {r['estado']: r['n'] for r in rows(db.execute("SELECT estado, COUNT(*) n FROM pedidos GROUP BY estado"))}
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

        msg = (f"Hola {pedido['cliente_nombre']}! 👋\n\n"
               f"Tu pedido *#{id}* fue *confirmado* en {TIENDA_CONFIG['nombre']} ✅\n\n"
               f"💰 Total: ${pedido['total']:,.0f}\n\nGracias por tu compra! 🙏")
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

@app.route('/api/factura/<int:id>')
def api_factura(id):
    db     = get_db()
    pedido = row(db.execute("SELECT * FROM pedidos WHERE id=?", (id,)))
    items  = rows(db.execute("SELECT dp.*,p.nombre as producto_nombre FROM detalle_pedidos dp JOIN productos p ON dp.producto_id=p.id WHERE dp.pedido_id=?", (id,)))
    db.close()
    if not pedido: return jsonify({'error': 'No encontrado'}), 404
    return jsonify({'pedido': pedido, 'items': items, 'config': TIENDA_CONFIG})


if __name__ == '__main__':
    init_db()
    print("\n  [OK] API lista en http://localhost:5000")
    print("  [OK] React dev: cd frontend && npm run dev\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
