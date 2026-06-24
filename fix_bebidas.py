import requests
BASE = 'https://tiendalarealco.pythonanywhere.com/api'

# Confirmar id de categoria Gaseosas
cats = requests.get(f'{BASE}/categorias').json()
gas = next((c for c in cats if c['nombre'].lower() == 'gaseosas'), None)
GASEOSAS = gas['id'] if gas else None
print(f"Categoria Gaseosas id={GASEOSAS}")

# (nombre, marca, precio, stock, stock_min)
productos = [
    ('Coca-Cola 1L retornable',                 'Coca-Cola',       3500, 24, 6),
    ('Coca-Cola 2L RP retornable',              'Coca-Cola',       6000, 24, 6),
    ('Kola Roman 1L retornable',                'Kola Roman',      3500, 24, 6),
    ('Quatro Toronja 1.5L no retornable',       'Quatro',          4500, 24, 6),
    ('Sprite 1.5L no retornable',               'Sprite',          4500, 24, 6),
    ('Postobon Litron 1.25L sabor Naranja',     'Postobon Litron', 3000, 24, 6),
    ('Postobon Litron 1.25L sabor Pina',        'Postobon Litron', 3000, 24, 6),
    ('Postobon Litron 1.25L sabor Uva',         'Postobon Litron', 3000, 24, 6),
    ('Postobon Litron 1.25L sabor Kola',        'Postobon Litron', 3000, 24, 6),
    ('Postobon Litron 1.25L sabor Manzana',     'Postobon Litron', 3000, 24, 6),
    ('Postobon Litron 1.25L sabor Pepsi',       'Postobon Litron', 3000, 24, 6),
    ('Postobon Litron 1.25L sabor Colombiana',  'Postobon Litron', 3000, 24, 6),
    ('Pepsi 1.75L no retornable',               'Pepsi',           4500, 24, 6),
    ('Manzana Postobon 1.75L no retornable',    'Postobon',        4500, 24, 6),
    ('Gatorade Frutos Tropicales 500ml',        'Gatorade',        4000, 24, 6),
    ('Squash Frutos Tropicales 500ml',          'Squash',          2500, 24, 6),
    ('Pepsi 2.5L',                              'Pepsi',           6000, 24, 6),
    ('Manzana Postobon 2.5L',                   'Postobon',        6000, 24, 6),
    ('Manzana Postobon 250ml retornable',       'Postobon',        1000, 48, 12),
    ('Uva Postobon 250ml retornable',           'Postobon',        1000, 48, 12),
]

existentes = {p['nombre'].lower() for p in requests.get(f'{BASE}/productos').json()}
ok = 0
for nombre, marca, precio, stock, smin in productos:
    if nombre.lower() in existentes:
        print(f'  YA EXISTE: {nombre}'); continue
    r = requests.post(f'{BASE}/productos', json={
        'nombre': nombre, 'marca': marca, 'precio_venta': precio, 'precio_compra': 0,
        'stock': stock, 'stock_minimo': smin, 'categoria_id': GASEOSAS,
        'codigo_barras': '', 'imagen': '', 'descripcion': '',
    })
    j = r.json()
    print(f"  {r.status_code}  id={j.get('id')}  {j.get('nombre')}")
    if r.status_code == 201: ok += 1

print(f'\n{ok} gaseosas creadas')
print('\n-- Gaseosas finales (por marca) --')
gaseosas = [p for p in requests.get(f'{BASE}/productos').json() if p['categoria_id'] == GASEOSAS]
for p in sorted(gaseosas, key=lambda x: (x['marca'], x['nombre'])):
    print(f"  {p['marca']:<16s}  {p['nombre']:<40s}  ${p['precio_venta']:>7,.0f}")
