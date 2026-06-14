from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
from database import init_db, get_db
from datetime import datetime, date
import urllib.parse

# =====================================================
# CONFIGURACION DE LA TIENDA  ← EDITA AQUI
# =====================================================
TIENDA_CONFIG = {
    'nombre':    'Tienda La Real',
    'whatsapp':  '573000000000',   # Tu número con código de país (57 = Colombia), sin + ni espacios
    'ciudad':    'Tu Ciudad',
    'direccion': 'Tu Dirección',
    'horario':   'Lun–Sáb 7am–9pm',
}
# =====================================================

app = Flask(__name__)
import os
app.secret_key = os.environ.get('SECRET_KEY', 'tienda_la_real_2024')

@app.context_processor
def inject_now():
    return {'now': datetime.now()}

@app.template_filter('cop')
def formato_cop(valor):
    """Formatea pesos colombianos: abrevia millones/miles para tarjetas pequeñas."""
    v = float(valor or 0)
    if v >= 1_000_000:
        return f'${v/1_000_000:.1f}M'
    if v >= 10_000:
        return f'${v/1_000:.0f}K'
    return f'${v:,.0f}'

# ==================== DASHBOARD ====================
@app.route('/')
def index():
    db = get_db()
    today = date.today().isoformat()

    ventas_hoy = db.execute(
        "SELECT COUNT(*), COALESCE(SUM(total), 0) FROM ventas WHERE DATE(created_at) = ?",
        (today,)
    ).fetchone()

    total_productos = db.execute("SELECT COUNT(*) FROM productos").fetchone()[0]
    stock_bajo      = db.execute("SELECT COUNT(*) FROM productos WHERE stock <= stock_minimo").fetchone()[0]
    total_clientes  = db.execute("SELECT COUNT(*) FROM clientes").fetchone()[0]

    ultimas_ventas = db.execute("""
        SELECT v.id, v.total, v.tipo_pago, v.created_at,
               COALESCE(c.nombre, 'Cliente General') as cliente
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        ORDER BY v.created_at DESC LIMIT 5
    """).fetchall()

    db.close()
    return render_template('index.html',
        ventas_hoy_count=ventas_hoy[0],
        ventas_hoy_total=ventas_hoy[1],
        total_productos=total_productos,
        stock_bajo=stock_bajo,
        total_clientes=total_clientes,
        ultimas_ventas=ultimas_ventas
    )

# ==================== INVENTARIO ====================
@app.route('/inventario')
def inventario():
    db = get_db()
    buscar      = request.args.get('q', '')
    categoria_id = request.args.get('categoria', '')

    query  = "SELECT p.*, c.nombre as categoria_nombre FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE 1=1"
    params = []

    if buscar:
        query += " AND (p.nombre LIKE ? OR p.codigo_barras LIKE ?)"
        params += [f'%{buscar}%', f'%{buscar}%']
    if categoria_id:
        query += " AND p.categoria_id = ?"
        params.append(categoria_id)

    query += " ORDER BY p.nombre"
    productos  = db.execute(query, params).fetchall()
    categorias = db.execute("SELECT * FROM categorias ORDER BY nombre").fetchall()
    db.close()
    return render_template('inventario/index.html',
        productos=productos, categorias=categorias,
        buscar=buscar, categoria_id=categoria_id)

@app.route('/inventario/nuevo', methods=['GET', 'POST'])
def inventario_nuevo():
    db = get_db()
    if request.method == 'POST':
        try:
            db.execute("""
                INSERT INTO productos (nombre, descripcion, precio_compra, precio_venta,
                                       stock, stock_minimo, categoria_id, codigo_barras)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                request.form['nombre'],
                request.form.get('descripcion', ''),
                float(request.form.get('precio_compra') or 0),
                float(request.form['precio_venta']),
                int(request.form.get('stock') or 0),
                int(request.form.get('stock_minimo') or 5),
                request.form.get('categoria_id') or None,
                request.form.get('codigo_barras', '')
            ))
            db.commit()
            flash('Producto agregado exitosamente', 'success')
            return redirect(url_for('inventario'))
        except Exception as e:
            flash(f'Error: {e}', 'danger')
    categorias = db.execute("SELECT * FROM categorias ORDER BY nombre").fetchall()
    db.close()
    return render_template('inventario/form.html', producto=None, categorias=categorias)

@app.route('/inventario/editar/<int:id>', methods=['GET', 'POST'])
def inventario_editar(id):
    db = get_db()
    if request.method == 'POST':
        try:
            db.execute("""
                UPDATE productos SET nombre=?, descripcion=?, precio_compra=?,
                precio_venta=?, stock=?, stock_minimo=?, categoria_id=?, codigo_barras=?
                WHERE id=?
            """, (
                request.form['nombre'],
                request.form.get('descripcion', ''),
                float(request.form.get('precio_compra') or 0),
                float(request.form['precio_venta']),
                int(request.form.get('stock') or 0),
                int(request.form.get('stock_minimo') or 5),
                request.form.get('categoria_id') or None,
                request.form.get('codigo_barras', ''),
                id
            ))
            db.commit()
            flash('Producto actualizado', 'success')
            return redirect(url_for('inventario'))
        except Exception as e:
            flash(f'Error: {e}', 'danger')
    producto   = db.execute("SELECT * FROM productos WHERE id=?", (id,)).fetchone()
    categorias = db.execute("SELECT * FROM categorias ORDER BY nombre").fetchall()
    db.close()
    if not producto:
        flash('Producto no encontrado', 'danger')
        return redirect(url_for('inventario'))
    return render_template('inventario/form.html', producto=producto, categorias=categorias)

@app.route('/inventario/eliminar/<int:id>', methods=['POST'])
def inventario_eliminar(id):
    db = get_db()
    db.execute("DELETE FROM productos WHERE id=?", (id,))
    db.commit()
    db.close()
    flash('Producto eliminado', 'warning')
    return redirect(url_for('inventario'))

# ==================== CATEGORIAS ====================
@app.route('/categorias')
def categorias():
    db = get_db()
    cats = db.execute("""
        SELECT c.*, COUNT(p.id) as total_productos
        FROM categorias c LEFT JOIN productos p ON c.id = p.categoria_id
        GROUP BY c.id ORDER BY c.nombre
    """).fetchall()
    db.close()
    return render_template('categorias/index.html', categorias=cats)

@app.route('/categorias/nueva', methods=['POST'])
def categoria_nueva():
    nombre = request.form.get('nombre', '').strip()
    if nombre:
        db = get_db()
        try:
            db.execute("INSERT INTO categorias (nombre) VALUES (?)", (nombre,))
            db.commit()
            flash('Categoría creada', 'success')
        except Exception:
            flash('Esa categoría ya existe', 'warning')
        db.close()
    return redirect(url_for('categorias'))

@app.route('/categorias/eliminar/<int:id>', methods=['POST'])
def categoria_eliminar(id):
    db = get_db()
    db.execute("UPDATE productos SET categoria_id = NULL WHERE categoria_id = ?", (id,))
    db.execute("DELETE FROM categorias WHERE id=?", (id,))
    db.commit()
    db.close()
    flash('Categoría eliminada', 'warning')
    return redirect(url_for('categorias'))

# ==================== VENTAS / POS ====================
@app.route('/ventas')
def ventas():
    db = get_db()
    clientes   = db.execute("SELECT id, nombre FROM clientes ORDER BY nombre").fetchall()
    categorias = db.execute("SELECT * FROM categorias ORDER BY nombre").fetchall()
    db.close()
    return render_template('ventas/pos.html', clientes=clientes, categorias=categorias)

@app.route('/ventas/nueva', methods=['POST'])
def venta_nueva():
    data = request.get_json()
    db   = get_db()
    try:
        cur = db.execute("""
            INSERT INTO ventas (cliente_id, total, tipo_pago, estado, created_at)
            VALUES (?, ?, ?, 'completada', datetime('now', 'localtime'))
        """, (data.get('cliente_id') or None, data['total'], data['tipo_pago']))
        venta_id = cur.lastrowid

        for item in data['items']:
            db.execute("""
                INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?)
            """, (venta_id, item['producto_id'], item['cantidad'],
                  item['precio_unitario'], item['subtotal']))
            db.execute("UPDATE productos SET stock = stock - ? WHERE id = ?",
                       (item['cantidad'], item['producto_id']))

        db.commit()
        db.close()
        return jsonify({'success': True, 'venta_id': venta_id})
    except Exception as e:
        db.rollback()
        db.close()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/ventas/historial')
def ventas_historial():
    db          = get_db()
    fecha_desde = request.args.get('desde', date.today().isoformat())
    fecha_hasta = request.args.get('hasta', date.today().isoformat())

    ventas = db.execute("""
        SELECT v.id, v.total, v.tipo_pago, v.estado, v.created_at,
               COALESCE(c.nombre, 'Cliente General') as cliente
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        WHERE DATE(v.created_at) BETWEEN ? AND ?
        ORDER BY v.created_at DESC
    """, (fecha_desde, fecha_hasta)).fetchall()

    total_periodo = db.execute("""
        SELECT COALESCE(SUM(total), 0) FROM ventas WHERE DATE(created_at) BETWEEN ? AND ?
    """, (fecha_desde, fecha_hasta)).fetchone()[0]

    db.close()
    return render_template('ventas/historial.html',
        ventas=ventas, fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta, total_periodo=total_periodo)

@app.route('/ventas/detalle/<int:id>')
def venta_detalle(id):
    db    = get_db()
    venta = db.execute("""
        SELECT v.*, COALESCE(c.nombre, 'Cliente General') as cliente
        FROM ventas v LEFT JOIN clientes c ON v.cliente_id = c.id WHERE v.id = ?
    """, (id,)).fetchone()
    items = db.execute("""
        SELECT dv.*, p.nombre as producto_nombre
        FROM detalle_ventas dv JOIN productos p ON dv.producto_id = p.id
        WHERE dv.venta_id = ?
    """, (id,)).fetchall()
    db.close()
    return jsonify({'venta': dict(venta) if venta else None, 'items': [dict(i) for i in items]})

# ==================== CLIENTES ====================
@app.route('/clientes')
def clientes():
    db     = get_db()
    buscar = request.args.get('q', '')
    query  = "SELECT * FROM clientes WHERE 1=1"
    params = []
    if buscar:
        query += " AND (nombre LIKE ? OR telefono LIKE ?)"
        params += [f'%{buscar}%', f'%{buscar}%']
    clientes_list = db.execute(query + " ORDER BY nombre", params).fetchall()
    db.close()
    return render_template('clientes/index.html', clientes=clientes_list, buscar=buscar)

@app.route('/clientes/nuevo', methods=['GET', 'POST'])
def cliente_nuevo():
    if request.method == 'POST':
        db = get_db()
        try:
            db.execute("INSERT INTO clientes (nombre, telefono, email, direccion) VALUES (?, ?, ?, ?)",
                (request.form['nombre'], request.form.get('telefono', ''),
                 request.form.get('email', ''), request.form.get('direccion', '')))
            db.commit()
            flash('Cliente registrado', 'success')
            return redirect(url_for('clientes'))
        except Exception as e:
            flash(f'Error: {e}', 'danger')
        db.close()
    return render_template('clientes/form.html', cliente=None)

@app.route('/clientes/editar/<int:id>', methods=['GET', 'POST'])
def cliente_editar(id):
    db = get_db()
    if request.method == 'POST':
        try:
            db.execute("UPDATE clientes SET nombre=?, telefono=?, email=?, direccion=? WHERE id=?",
                (request.form['nombre'], request.form.get('telefono', ''),
                 request.form.get('email', ''), request.form.get('direccion', ''), id))
            db.commit()
            flash('Cliente actualizado', 'success')
            return redirect(url_for('clientes'))
        except Exception as e:
            flash(f'Error: {e}', 'danger')
    cliente = db.execute("SELECT * FROM clientes WHERE id=?", (id,)).fetchone()
    db.close()
    return render_template('clientes/form.html', cliente=cliente)

@app.route('/clientes/eliminar/<int:id>', methods=['POST'])
def cliente_eliminar(id):
    db = get_db()
    db.execute("DELETE FROM clientes WHERE id=?", (id,))
    db.commit()
    db.close()
    flash('Cliente eliminado', 'warning')
    return redirect(url_for('clientes'))

# ==================== CAJA ====================
@app.route('/caja')
def caja():
    db          = get_db()
    caja_actual = db.execute(
        "SELECT * FROM caja WHERE estado='abierta' ORDER BY fecha_apertura DESC LIMIT 1"
    ).fetchone()
    movimientos = []
    total_entradas = total_salidas = 0
    if caja_actual:
        movimientos = db.execute(
            "SELECT * FROM movimientos_caja WHERE caja_id=? ORDER BY created_at DESC",
            (caja_actual['id'],)
        ).fetchall()
        ventas_caja = db.execute(
            "SELECT COALESCE(SUM(total),0) FROM ventas WHERE DATE(created_at) = DATE(?,'+0 days')",
            (caja_actual['fecha_apertura'],)
        ).fetchone()[0]
        total_entradas = sum(m['monto'] for m in movimientos if m['tipo'] == 'entrada') + ventas_caja
        total_salidas  = sum(m['monto'] for m in movimientos if m['tipo'] == 'salida')
    db.close()
    return render_template('caja/index.html',
        caja=caja_actual, movimientos=movimientos,
        total_entradas=total_entradas, total_salidas=total_salidas)

@app.route('/caja/abrir', methods=['POST'])
def caja_abrir():
    db = get_db()
    db.execute("INSERT INTO caja (fecha_apertura, monto_apertura, estado) VALUES (datetime('now','localtime'), ?, 'abierta')",
               (float(request.form.get('monto_apertura', 0)),))
    db.commit()
    db.close()
    flash('Caja abierta exitosamente', 'success')
    return redirect(url_for('caja'))

@app.route('/caja/cerrar/<int:id>', methods=['POST'])
def caja_cerrar(id):
    db = get_db()
    db.execute("UPDATE caja SET fecha_cierre=datetime('now','localtime'), monto_cierre=?, estado='cerrada' WHERE id=?",
               (float(request.form.get('monto_cierre', 0)), id))
    db.commit()
    db.close()
    flash('Caja cerrada', 'success')
    return redirect(url_for('caja'))

@app.route('/caja/movimiento/<int:caja_id>', methods=['POST'])
def caja_movimiento(caja_id):
    db = get_db()
    db.execute("INSERT INTO movimientos_caja (caja_id, tipo, monto, concepto, created_at) VALUES (?, ?, ?, ?, datetime('now','localtime'))",
               (caja_id, request.form['tipo'], float(request.form['monto']), request.form.get('concepto', '')))
    db.commit()
    db.close()
    flash('Movimiento registrado', 'success')
    return redirect(url_for('caja'))

# ==================== REPORTES ====================
@app.route('/reportes')
def reportes():
    db        = get_db()
    today     = date.today().isoformat()
    mes_actual = date.today().strftime('%Y-%m')

    stats_hoy = db.execute(
        "SELECT COUNT(*) as ventas, COALESCE(SUM(total),0) as total FROM ventas WHERE DATE(created_at)=?",
        (today,)
    ).fetchone()

    stats_mes = db.execute(
        "SELECT COUNT(*) as ventas, COALESCE(SUM(total),0) as total FROM ventas WHERE strftime('%Y-%m',created_at)=?",
        (mes_actual,)
    ).fetchone()

    top_productos = db.execute("""
        SELECT p.nombre, SUM(dv.cantidad) as total_vendido, SUM(dv.subtotal) as total_ingresos
        FROM detalle_ventas dv
        JOIN productos p ON dv.producto_id = p.id
        JOIN ventas v ON dv.venta_id = v.id
        WHERE strftime('%Y-%m', v.created_at) = ?
        GROUP BY p.id ORDER BY total_vendido DESC LIMIT 8
    """, (mes_actual,)).fetchall()

    por_tipo_pago = db.execute("""
        SELECT tipo_pago, COUNT(*) as cantidad, SUM(total) as total
        FROM ventas WHERE strftime('%Y-%m', created_at) = ? GROUP BY tipo_pago
    """, (mes_actual,)).fetchall()

    ventas_semana = db.execute("""
        SELECT DATE(created_at) as fecha, COALESCE(SUM(total),0) as total
        FROM ventas WHERE DATE(created_at) >= DATE('now','-6 days','localtime')
        GROUP BY DATE(created_at) ORDER BY fecha
    """).fetchall()

    stock_bajo = db.execute(
        "SELECT nombre, stock, stock_minimo FROM productos WHERE stock <= stock_minimo ORDER BY stock LIMIT 10"
    ).fetchall()

    db.close()
    return render_template('reportes/index.html',
        stats_hoy=stats_hoy, stats_mes=stats_mes,
        top_productos=top_productos, por_tipo_pago=por_tipo_pago,
        ventas_semana=ventas_semana, stock_bajo=stock_bajo)

# ==================== API ====================
@app.route('/api/productos')
def api_productos():
    db = get_db()
    q  = request.args.get('q', '')
    cat = request.args.get('cat', '')
    query = "SELECT id, nombre, precio_venta, stock, codigo_barras FROM productos WHERE stock > 0"
    params = []
    if q:
        query += " AND (nombre LIKE ? OR codigo_barras LIKE ?)"
        params += [f'%{q}%', f'%{q}%']
    if cat:
        query += " AND categoria_id = ?"
        params.append(cat)
    query += " ORDER BY nombre LIMIT 100"
    productos = db.execute(query, params).fetchall()
    db.close()
    return jsonify([dict(p) for p in productos])

# ==================== CATALOGO PUBLICO ====================
@app.route('/catalogo')
def catalogo():
    db = get_db()
    categorias = db.execute("SELECT * FROM categorias ORDER BY nombre").fetchall()
    productos  = db.execute("""
        SELECT p.id, p.nombre, p.precio_venta, p.stock, p.descripcion,
               c.nombre as categoria_nombre, c.id as categoria_id
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        ORDER BY p.nombre
    """).fetchall()
    db.close()
    return render_template('catalogo/index.html',
        productos=productos, categorias=categorias, config=TIENDA_CONFIG)

@app.route('/catalogo/pedido', methods=['POST'])
def catalogo_pedido():
    data = request.get_json()
    db   = get_db()
    try:
        cur = db.execute("""
            INSERT INTO pedidos (cliente_nombre, cliente_telefono, cliente_direccion, total, notas)
            VALUES (?, ?, ?, ?, ?)
        """, (data['nombre'], data['telefono'], data.get('direccion',''), data['total'], data.get('notas','')))
        pedido_id = cur.lastrowid

        for item in data['items']:
            db.execute("""
                INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?)
            """, (pedido_id, item['producto_id'], item['cantidad'], item['precio_unitario'], item['subtotal']))

        db.commit()
        db.close()
        return jsonify({'success': True, 'pedido_id': pedido_id})
    except Exception as e:
        db.rollback()
        db.close()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/catalogo/confirmado/<int:id>')
def catalogo_confirmado(id):
    db     = get_db()
    pedido = db.execute("SELECT * FROM pedidos WHERE id=?", (id,)).fetchone()
    items  = db.execute("""
        SELECT dp.*, p.nombre as producto_nombre
        FROM detalle_pedidos dp JOIN productos p ON dp.producto_id = p.id
        WHERE dp.pedido_id = ?
    """, (id,)).fetchall()
    db.close()
    if not pedido:
        return redirect(url_for('catalogo'))

    # Generar mensaje WhatsApp
    lineas = '\n'.join([
        f"• {i['producto_nombre']} x{i['cantidad']} = ${i['subtotal']:,.0f}"
        for i in items
    ])
    mensaje = (
        f"Hola *{TIENDA_CONFIG['nombre']}*! 🛒\n\n"
        f"Quiero hacer este pedido:\n\n"
        f"*Pedido #{pedido['id']}*\n"
        f"{lineas}\n\n"
        f"💰 *TOTAL: ${pedido['total']:,.0f}*\n\n"
        f"📋 *Mis datos:*\n"
        f"Nombre: {pedido['cliente_nombre']}\n"
        f"Tel: {pedido['cliente_telefono']}\n"
        + (f"Dirección: {pedido['cliente_direccion']}\n" if pedido['cliente_direccion'] else "")
        + (f"Notas: {pedido['notas']}\n" if pedido['notas'] else "")
        + "\n_Confirmen disponibilidad por favor_ 🙏"
    )
    wa_link = f"https://wa.me/{TIENDA_CONFIG['whatsapp']}?text={urllib.parse.quote(mensaje)}"

    return render_template('catalogo/confirmado.html',
        pedido=pedido, items=items, wa_link=wa_link, config=TIENDA_CONFIG)

# ==================== PEDIDOS (ADMIN) ====================
@app.route('/pedidos')
def pedidos():
    db = get_db()
    estado = request.args.get('estado', 'pendiente')
    lista  = db.execute("""
        SELECT p.*, COUNT(dp.id) as num_items
        FROM pedidos p LEFT JOIN detalle_pedidos dp ON p.id = dp.pedido_id
        WHERE p.estado = ?
        GROUP BY p.id ORDER BY p.created_at DESC
    """, (estado,)).fetchall()

    conteos = db.execute("""
        SELECT estado, COUNT(*) as n FROM pedidos GROUP BY estado
    """).fetchall()
    conteos_dict = {r['estado']: r['n'] for r in conteos}
    db.close()
    return render_template('pedidos/index.html',
        pedidos=lista, estado=estado, conteos=conteos_dict)

@app.route('/pedidos/detalle/<int:id>')
def pedido_detalle(id):
    db     = get_db()
    pedido = db.execute("SELECT * FROM pedidos WHERE id=?", (id,)).fetchone()
    items  = db.execute("""
        SELECT dp.*, p.nombre as producto_nombre, p.stock as stock_actual
        FROM detalle_pedidos dp JOIN productos p ON dp.producto_id = p.id
        WHERE dp.pedido_id = ?
    """, (id,)).fetchall()
    db.close()
    return jsonify({'pedido': dict(pedido) if pedido else None,
                    'items': [dict(i) for i in items]})

@app.route('/pedidos/<int:id>/confirmar', methods=['POST'])
def pedido_confirmar(id):
    db = get_db()
    try:
        pedido = db.execute("SELECT * FROM pedidos WHERE id=?", (id,)).fetchone()
        items  = db.execute("""
            SELECT dp.*, p.stock FROM detalle_pedidos dp
            JOIN productos p ON dp.producto_id = p.id WHERE dp.pedido_id=?
        """, (id,)).fetchall()

        # Verificar stock
        sin_stock = [i['producto_id'] for i in items if i['cantidad'] > i['stock']]
        if sin_stock:
            db.close()
            return jsonify({'success': False, 'error': 'Algunos productos no tienen stock suficiente'}), 400

        # Crear venta
        cur = db.execute("""
            INSERT INTO ventas (total, tipo_pago, estado, created_at)
            VALUES (?, 'pendiente_cobro', 'completada', datetime('now','localtime'))
        """, (pedido['total'],))
        venta_id = cur.lastrowid

        for item in items:
            db.execute("""
                INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?)
            """, (venta_id, item['producto_id'], item['cantidad'], item['precio_unitario'], item['subtotal']))
            db.execute("UPDATE productos SET stock=stock-? WHERE id=?",
                       (item['cantidad'], item['producto_id']))

        # Marcar pedido confirmado y enlazar venta
        db.execute("UPDATE pedidos SET estado='confirmado', venta_id=? WHERE id=?",
                   (venta_id, id))

        # Generar link factura + mensaje WhatsApp
        factura_url = url_for('factura', id=id, _external=True)
        mensaje = (
            f"Hola {pedido['cliente_nombre']}! 👋\n\n"
            f"Tu pedido *#{id}* ha sido *confirmado* en {TIENDA_CONFIG['nombre']}.\n\n"
            f"💰 Total: ${pedido['total']:,.0f}\n\n"
            f"📄 Tu factura: {factura_url}\n\n"
            f"Gracias por tu compra! 🙏"
        )
        wa_cliente = (
            f"https://wa.me/{pedido['cliente_telefono'].replace(' ','').replace('+','')}?text={urllib.parse.quote(mensaje)}"
            if pedido['cliente_telefono'] else None
        )

        db.commit()
        db.close()
        return jsonify({'success': True, 'venta_id': venta_id, 'wa_cliente': wa_cliente, 'factura_url': factura_url})
    except Exception as e:
        db.rollback()
        db.close()
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/pedidos/<int:id>/cancelar', methods=['POST'])
def pedido_cancelar(id):
    db = get_db()
    db.execute("UPDATE pedidos SET estado='cancelado' WHERE id=?", (id,))
    db.commit()
    db.close()
    return jsonify({'success': True})

# ==================== FACTURA PUBLICA ====================
@app.route('/factura/<int:id>')
def factura(id):
    db     = get_db()
    pedido = db.execute("SELECT * FROM pedidos WHERE id=?", (id,)).fetchone()
    items  = db.execute("""
        SELECT dp.*, p.nombre as producto_nombre
        FROM detalle_pedidos dp JOIN productos p ON dp.producto_id=p.id
        WHERE dp.pedido_id=?
    """, (id,)).fetchall()
    db.close()
    if not pedido:
        return "Factura no encontrada", 404
    return render_template('factura/index.html',
        pedido=pedido, items=items, config=TIENDA_CONFIG)

if __name__ == '__main__':
    init_db()
    print("\n  [OK] Base de datos lista")
    print("  [OK] Abre tu navegador en: http://localhost:5000\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
