import sqlite3
import os

# En producción (Railway), la base de datos vive en el volumen montado en /data
DB_PATH = os.environ.get('DB_PATH', 'tienda.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS categorias (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS productos (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre         TEXT NOT NULL,
            descripcion    TEXT DEFAULT '',
            precio_compra  REAL DEFAULT 0,
            precio_venta   REAL NOT NULL,
            stock          INTEGER DEFAULT 0,
            stock_minimo   INTEGER DEFAULT 5,
            categoria_id   INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
            codigo_barras  TEXT DEFAULT '',
            created_at     TIMESTAMP DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS clientes (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre       TEXT NOT NULL,
            telefono     TEXT DEFAULT '',
            email        TEXT DEFAULT '',
            direccion    TEXT DEFAULT '',
            created_at   TIMESTAMP DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS ventas (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id  INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
            total       REAL NOT NULL,
            tipo_pago   TEXT DEFAULT 'efectivo',
            estado      TEXT DEFAULT 'completada',
            created_at  TIMESTAMP DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS detalle_ventas (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            venta_id        INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
            producto_id     INTEGER NOT NULL REFERENCES productos(id),
            cantidad        INTEGER NOT NULL,
            precio_unitario REAL NOT NULL,
            subtotal        REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS caja (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha_apertura  TIMESTAMP,
            fecha_cierre    TIMESTAMP,
            monto_apertura  REAL DEFAULT 0,
            monto_cierre    REAL DEFAULT 0,
            estado          TEXT DEFAULT 'abierta'
        );

        CREATE TABLE IF NOT EXISTS movimientos_caja (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            caja_id    INTEGER NOT NULL REFERENCES caja(id),
            tipo       TEXT NOT NULL,
            monto      REAL NOT NULL,
            concepto   TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS pedidos (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_nombre    TEXT NOT NULL,
            cliente_telefono  TEXT DEFAULT '',
            cliente_direccion TEXT DEFAULT '',
            total             REAL NOT NULL,
            estado            TEXT DEFAULT 'pendiente',
            notas             TEXT DEFAULT '',
            venta_id          INTEGER REFERENCES ventas(id) ON DELETE SET NULL,
            created_at        TIMESTAMP DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS detalle_pedidos (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id       INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
            producto_id     INTEGER NOT NULL REFERENCES productos(id),
            cantidad        INTEGER NOT NULL,
            precio_unitario REAL NOT NULL,
            subtotal        REAL NOT NULL
        );
    """)

    # Migración: columnas de pago (no falla si ya existen)
    for col_sql in [
        "ALTER TABLE pedidos ADD COLUMN comprobante_b64 TEXT DEFAULT ''",
        "ALTER TABLE pedidos ADD COLUMN pago_verificado INTEGER DEFAULT 0",
    ]:
        try: conn.execute(col_sql)
        except: pass
    conn.commit()

    if not conn.execute("SELECT COUNT(*) FROM categorias").fetchone()[0]:
        conn.executescript("""
            INSERT INTO categorias (nombre) VALUES
                ('Bebidas'), ('Lácteos'), ('Panadería'),
                ('Aseo'), ('Granos'), ('Snacks'), ('Otros');
        """)

    conn.commit()
    conn.close()
