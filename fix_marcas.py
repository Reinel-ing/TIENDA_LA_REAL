import requests
BASE = 'https://tiendalarealco.pythonanywhere.com/api'
CERVEZA = 2  # categoria

nuevos = [
    # nombre, marca, precio, stock, stock_min
    ('Cerveza Club Colombia Dorada lata 269ml x1',   'Club Colombia', 3000,  100, 12),
    ('Cerveza Club Colombia Dorada lata 269ml x24',  'Club Colombia', 67000, 20,  3),
    ('Cerveza Stella Artois lata 269ml x1',          'Stella Artois', 3700,  100, 12),
    ('Cerveza Poker botella retornable 1L x1',       'Poker',         6000,  48,  6),
    ('Cerveza Costeña Roja retornable 750ml x1',     'Costeña',       4000,  48,  6),
    ('Cerveza Miller Lite lata 269ml x1',            'Miller',        2500,  100, 12),
    ('Cerveza Miller Lite lata 269ml x24',           'Miller',        48000, 20,  3),
]

# Evitar duplicados: ver nombres que ya existen
existentes = {p['nombre'].lower() for p in requests.get(f'{BASE}/productos').json()}

for nombre, marca, precio, stock, smin in nuevos:
    if nombre.lower() in existentes:
        print(f'  YA EXISTE: {nombre}')
        continue
    r = requests.post(f'{BASE}/productos', json={
        'nombre': nombre, 'marca': marca, 'precio_venta': precio, 'precio_compra': 0,
        'stock': stock, 'stock_minimo': smin, 'categoria_id': CERVEZA,
        'codigo_barras': '', 'imagen': '', 'descripcion': '',
    })
    j = r.json()
    print(f"  {r.status_code}  id={j.get('id')}  {j.get('nombre')}")

print('\n-- Cervezas finales (ordenadas por marca) --')
cervezas = [p for p in requests.get(f'{BASE}/productos').json() if p['categoria_id'] == CERVEZA]
for p in sorted(cervezas, key=lambda x: (x['marca'], x['nombre'])):
    print(f"  {p['marca']:<14s}  {p['nombre']:<42s}  ${p['precio_venta']:>8,.0f}")
