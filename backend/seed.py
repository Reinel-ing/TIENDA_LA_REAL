"""
Poblar la base de datos de Tienda La Real con datos de ejemplo.
Ejecutar una sola vez: python seed.py
"""
from database import get_db, init_db
from datetime import datetime, date, timedelta
import random

init_db()
db = get_db()

# ============================================================
# CATEGORIAS
# ============================================================
db.execute("DELETE FROM movimientos_caja")
db.execute("DELETE FROM caja")
db.execute("DELETE FROM detalle_ventas")
db.execute("DELETE FROM ventas")
db.execute("DELETE FROM productos")
db.execute("DELETE FROM clientes")
db.execute("DELETE FROM categorias")
db.execute("DELETE FROM sqlite_sequence WHERE name IN ('categorias','productos','clientes','ventas','detalle_ventas','caja','movimientos_caja')")

categorias = [
    (1, 'Bebidas'),
    (2, 'Lacteos'),
    (3, 'Panaderia'),
    (4, 'Aseo'),
    (5, 'Granos y Secos'),
    (6, 'Snacks'),
    (7, 'Licores'),
    (8, 'Otros'),
]
db.executemany("INSERT INTO categorias (id, nombre) VALUES (?, ?)", categorias)

# ============================================================
# PRODUCTOS  (nombre, desc, p_compra, p_venta, stock, stock_min, cat_id, cod_barras)
# ============================================================
productos = [
    # BEBIDAS
    ('Coca-Cola 400ml',        '',  1800,  2500,  48, 12, 1, '7702025001438'),
    ('Coca-Cola 1.5L',         '',  4200,  5500,  24,  6, 1, '7702025001445'),
    ('Pepsi 400ml',            '',  1700,  2500,  36, 10, 1, '7591113100088'),
    ('Agua Brisa 600ml',       '',   900,  1500,  60, 12, 1, '7702035000022'),
    ('Agua Brisa 1.5L',        '',  1800,  2500,  30,  8, 1, '7702035000039'),
    ('Gatorade 500ml',         '',  2800,  4000,  20,  6, 1, '0052000049439'),
    ('Jugo Hit 350ml',         '',  1500,  2200,  40, 10, 1, '7702025006839'),
    ('Postobón Uva 400ml',     '',  1700,  2500,  36, 10, 1, '7702025003234'),
    ('Postobón Manzana 400ml', '',  1700,  2500,  36, 10, 1, '7702025003241'),
    ('Red Bull 250ml',         '',  4500,  6000,  15,  5, 1, '9002490100063'),
    ('Milo 200ml',             '',  1800,  2500,  24,  6, 1, '7613034998040'),
    ('Leche Chocolate Alqueria 200ml','', 1400, 2000, 30, 8, 1, '7702032007891'),
    # LACTEOS
    ('Leche Alqueria Bolsa 1L','',  2500,  3200,  40, 10, 2, '7702032007000'),
    ('Leche Alpina Bolsa 1L',  '',  2400,  3200,  40, 10, 2, '7702001000040'),
    ('Queso Campesino 250g',   '',  4500,  6000,  15,  5, 2, '7702001001001'),
    ('Queso Mozarella 200g',   '',  5500,  7500,  10,  4, 2, '7702001001018'),
    ('Mantequilla Colanta 125g','', 3200,  4500,  20,  6, 2, '7702032002001'),
    ('Yogurt Alpina 200g',     '',  2000,  3000,  25,  8, 2, '7702001002001'),
    ('Kumis Alpina 200g',      '',  1800,  2500,  20,  6, 2, '7702001002018'),
    ('Arequipe 450g',          '',  4800,  6500,  12,  4, 2, '7702032008001'),
    # PANADERIA
    ('Pan Tajado Bimbo 500g',  '',  4200,  5500,  10,  4, 3, '7501030500238'),
    ('Pan Tajado Olimpica 400g','', 3200,  4200,  12,  4, 3, '7702001003001'),
    ('Galletas Festival 150g', '',  2000,  2800,  24,  8, 3, '7702025005001'),
    ('Galletas Oreo 176g',     '',  3500,  4800,  18,  6, 3, '7622210673503'),
    ('Galletas Dux 90g',       '',  1500,  2200,  24,  8, 3, '7702001004001'),
    ('Ponque Chocoramo 45g',   '',  1500,  2000,  30, 10, 3, '7702025010001'),
    ('Gala 30g',               '',   900,  1500,  36, 12, 3, '7702025011001'),
    ('Pony Malta 300ml',       '',  2000,  2800,  24,  8, 3, '7702025012001'),
    # ASEO
    ('Jabon Protex 130g',      '',  2800,  4000,  24,  8, 4, '8001841026404'),
    ('Jabon Palmolive 125g',   '',  2500,  3500,  24,  8, 4, '7500435022011'),
    ('Shampoo Head Shoulders 400ml','', 18000, 24000, 8, 3, 4, '3614226443007'),
    ('Detergente Ariel 500g',  '',  6000,  8500,  12,  4, 4, '0037000750406'),
    ('Detergente Fab 1kg',     '',  7500, 10000,  10,  4, 4, '7702097000010'),
    ('Papel Higienico Scott x4','',  6500,  9000,  15,  5, 4, '0054400001006'),
    ('Papel Higienico Elite x4','',  5500,  8000,  15,  5, 4, '7702032009001'),
    ('Suavizante Comfort 500ml','',  5000,  7000,  10,  4, 4, '8712566407842'),
    ('Toalla Familia x6',      '',  4500,  6500,  12,  4, 4, '7702032010001'),
    ('Crema Dental Colgate 75ml','', 3500,  5000,  20,  6, 4, '8714789957011'),
    # GRANOS Y SECOS
    ('Arroz Diana 1kg',        '',  3000,  4000,  30, 10, 5, '7702001005001'),
    ('Arroz Roa 500g',         '',  1800,  2500,  20,  8, 5, '7702001006001'),
    ('Lentejas 500g',          '',  2800,  4000,  15,  6, 5, '7702001007001'),
    ('Frijoles Cargamanto 500g','',  3000,  4200,  15,  6, 5, '7702001008001'),
    ('Pasta Doria Espagueti 500g','', 2000, 2800,  24,  8, 5, '7702025015001'),
    ('Aceite Girasol 1L',      '',  7500, 10000,  10,  4, 5, '7702025016001'),
    ('Azucar Manuelita 1kg',   '',  3500,  5000,  20,  8, 5, '7702097001001'),
    ('Sal Refisal 500g',       '',  1200,  1800,  20,  8, 5, '7702097002001'),
    ('Cafe Sello Rojo 500g',   '',  9000, 13000,  10,  4, 5, '7702001009001'),
    ('Panela 500g',            '',  2500,  3500,  20,  6, 5, '7702001010001'),
    ('Avena en Hojuelas 300g', '',  3000,  4200,  12,  4, 5, '7702001011001'),
    ('Maizena 250g',           '',  2200,  3000,  15,  5, 5, '7702001012001'),
    # SNACKS
    ('Papas Margarita 115g',   '',  3500,  5000,  24,  8, 6, '7702001013001'),
    ('Papas Pringles 40g',     '',  2800,  4000,  18,  6, 6, '0038000845222'),
    ('Mani Presto 80g',        '',  2000,  3000,  30, 10, 6, '7702001014001'),
    ('Chicharron Inalbone 30g','',  1500,  2200,  30, 10, 6, '7702001015001'),
    ('Chocolatina Jet 16g',    '',   900,  1500,  36, 12, 6, '7702001016001'),
    ('Chocolatina Nucita 21g', '',   900,  1500,  30, 10, 6, '7702001017001'),
    ('Bon Bon Bum Fresa',      '',   500,   800,  48, 15, 6, '7702001018001'),
    ('Trident Menta x12',      '',  2000,  3000,  24,  8, 6, '7622210012594'),
    ('Maizitos Tosh 25g',      '',  1200,  1800,  36, 12, 6, '7702001019001'),
    ('Brownie 50g',            '',  2000,  3000,  20,  8, 6, '7702001020001'),
    # LICORES
    ('Cerveza Aguila 330ml',   '',  2200,  3000,  48, 12, 7, '7702001021001'),
    ('Cerveza Club Colombia 330ml','', 3000, 4000, 36, 10, 7, '7702001022001'),
    ('Aguardiente Antioqueño 375ml','',22000,30000,  6,  2, 7, '7702001023001'),
    ('Ron Caldas 375ml',       '',  18000, 25000,  6,  2, 7, '7702001024001'),
    ('Vino Gato Tinto 750ml',  '',  12000, 18000,  4,  2, 7, '7702001025001'),
    # OTROS
    ('Vela x6',                '',  1500,  2500,  20,  8, 8, ''),
    ('Fosforos El Rey',        '',   500,  1000,  30, 10, 8, ''),
    ('Pila AA Duracell x2',    '',  4500,  7000,  10,  4, 8, '5000394052741'),
    ('Cinta Transparente',     '',  1500,  2500,  12,  4, 8, ''),
    ('Bolsa Negra x10',        '',  1800,  3000,  20,  6, 8, ''),
]

db.executemany("""
    INSERT INTO productos (nombre, descripcion, precio_compra, precio_venta, stock, stock_minimo, categoria_id, codigo_barras)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", productos)

# ============================================================
# CLIENTES
# ============================================================
clientes = [
    ('Maria Gonzalez',    '3012345678', 'maria@gmail.com',         'Calle 5 # 10-23'),
    ('Carlos Perez',      '3109876543', 'carlos.p@hotmail.com',    'Carrera 8 # 15-06'),
    ('Ana Lucia Ramirez', '3201234567', '',                        'Barrio El Bosque Mz 3'),
    ('Jorge Hernandez',   '3157894561', 'jorge.h@gmail.com',       'Calle 12 # 4-88'),
    ('Lucia Morales',     '3004567891', '',                        'Diagonal 9 # 2-15'),
    ('Pedro Vargas',      '3132456789', 'pedrov@yahoo.com',        'Cra 6 # 8-42'),
    ('Rosa Elena Torres', '3218765432', '',                        'Calle 3 # 11-56'),
    ('Andres Castillo',   '3001234568', 'acastillo@gmail.com',     'Barrio La Union'),
    ('Claudia Jimenez',   '3185678901', '',                        'Cra 10 # 5-23'),
    ('Luis Mendoza',      '3042345678', 'luis.m@gmail.com',        'Calle 7 # 6-90'),
]
db.executemany("""
    INSERT INTO clientes (nombre, telefono, email, direccion)
    VALUES (?, ?, ?, ?)
""", clientes)

# ============================================================
# VENTAS HISTORICAS (ultimos 30 dias)
# ============================================================
prods_db = db.execute("SELECT id, precio_venta, stock FROM productos").fetchall()
clientes_db = db.execute("SELECT id FROM clientes").fetchall()
cliente_ids = [c['id'] for c in clientes_db]

tipos_pago = ['efectivo', 'efectivo', 'efectivo', 'transferencia', 'tarjeta']

total_ventas = 0

for dias_atras in range(30, 0, -1):
    fecha_dia = datetime.now() - timedelta(days=dias_atras)
    # Entre 8 y 25 ventas por dia
    num_ventas = random.randint(8, 25)

    for _ in range(num_ventas):
        hora = random.randint(7, 20)
        minuto = random.randint(0, 59)
        fecha_venta = fecha_dia.replace(hour=hora, minute=minuto, second=random.randint(0, 59))

        tipo_pago = random.choice(tipos_pago)
        cliente_id = random.choice(cliente_ids + [None, None, None])  # mayoria cliente general

        # Entre 1 y 6 productos por venta
        num_items = random.randint(1, 6)
        items_seleccionados = random.sample(prods_db, min(num_items, len(prods_db)))

        total_venta = 0
        detalle = []
        for prod in items_seleccionados:
            cantidad = random.randint(1, 3)
            precio   = prod['precio_venta']
            subtotal = cantidad * precio
            total_venta += subtotal
            detalle.append((prod['id'], cantidad, precio, subtotal))

        cur = db.execute("""
            INSERT INTO ventas (cliente_id, total, tipo_pago, estado, created_at)
            VALUES (?, ?, ?, 'completada', ?)
        """, (cliente_id, total_venta, tipo_pago, fecha_venta.strftime('%Y-%m-%d %H:%M:%S')))
        venta_id = cur.lastrowid

        for (pid, cant, precio, sub) in detalle:
            db.execute("""
                INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?)
            """, (venta_id, pid, cant, precio, sub))

        total_ventas += 1

# ============================================================
# CAJA DEL DIA
# ============================================================
db.execute("""
    INSERT INTO caja (fecha_apertura, monto_apertura, estado)
    VALUES (datetime('now','localtime','-8 hours'), 50000, 'abierta')
""")

db.commit()
db.close()

print("Base de datos cargada:")
print(f"  - {len(categorias)} categorias")
print(f"  - {len(productos)} productos")
print(f"  - {len(clientes)} clientes")
print(f"  - {total_ventas} ventas historicas (30 dias)")
print("  - Caja del dia abierta con $50.000")
