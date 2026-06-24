import requests

BASE = 'https://tiendalarealco.pythonanywhere.com/api'

# Revisar primero el producto existente para obtener sus campos actuales
r = requests.get(f'{BASE}/productos')
prods = r.json()
p3 = next((p for p in prods if p['id'] == 3), None)
print('Producto 3 actual:', p3)

# Actualizar Miller Lite x unidad (id=3)
if p3:
    r = requests.put(f'{BASE}/productos/3', json={
        'nombre': 'Miller Lite lata 269ml x unidad',
        'marca': 'Miller',
        'precio_venta': 2500,
        'precio_compra': p3.get('precio_compra', 0),
        'stock': p3.get('stock', 100),
        'stock_minimo': p3.get('stock_minimo', 12),
        'categoria_id': 2,
        'codigo_barras': p3.get('codigo_barras', ''),
        'imagen': p3.get('imagen', ''),
        'descripcion': p3.get('descripcion', ''),
    })
    print('Miller Lite x unidad:', r.status_code, r.text[:200])

p4 = next((p for p in prods if p['id'] == 4), None)
if p4:
    r = requests.put(f'{BASE}/productos/4', json={
        'nombre': 'Miller Lite lata 269ml x caja x24',
        'marca': 'Miller',
        'precio_venta': 48000,
        'precio_compra': p4.get('precio_compra', 0),
        'stock': p4.get('stock', 20),
        'stock_minimo': p4.get('stock_minimo', 3),
        'categoria_id': 2,
        'codigo_barras': p4.get('codigo_barras', ''),
        'imagen': p4.get('imagen', ''),
        'descripcion': p4.get('descripcion', ''),
    })
    print('Miller Lite x caja:', r.status_code, r.text[:200])

p15 = next((p for p in prods if p['id'] == 15), None)
if p15:
    r = requests.put(f'{BASE}/productos/15', json={
        'nombre': 'Heineken lata 269ml x unidad',
        'marca': 'Heineken',
        'precio_venta': 3000,
        'precio_compra': p15.get('precio_compra', 0),
        'stock': p15.get('stock', 24),
        'stock_minimo': p15.get('stock_minimo', 6),
        'categoria_id': 2,
        'codigo_barras': p15.get('codigo_barras', ''),
        'imagen': p15.get('imagen', ''),
        'descripcion': p15.get('descripcion', ''),
    })
    print('Heineken x unidad:', r.status_code, r.text[:200])

# Agregar Heineken x caja x24
r = requests.post(f'{BASE}/productos', json={
    'nombre': 'Heineken lata 269ml x caja x24',
    'marca': 'Heineken',
    'precio_venta': 68500,
    'precio_compra': 0,
    'stock': 10,
    'stock_minimo': 2,
    'categoria_id': 2,
    'codigo_barras': '',
    'imagen': '',
    'descripcion': '',
})
print('Heineken x caja:', r.status_code, r.text[:200])

# Agregar Andina lata 269ml x unidad
r = requests.post(f'{BASE}/productos', json={
    'nombre': 'Andina lata 269ml x unidad',
    'marca': 'Andina',
    'precio_venta': 2500,
    'precio_compra': 0,
    'stock': 100,
    'stock_minimo': 12,
    'categoria_id': 2,
    'codigo_barras': '',
    'imagen': '',
    'descripcion': '',
})
print('Andina x unidad:', r.status_code, r.text[:200])

# Agregar Andina lata 269ml x caja x24
r = requests.post(f'{BASE}/productos', json={
    'nombre': 'Andina lata 269ml x caja x24',
    'marca': 'Andina',
    'precio_venta': 50000,
    'precio_compra': 0,
    'stock': 20,
    'stock_minimo': 3,
    'categoria_id': 2,
    'codigo_barras': '',
    'imagen': '',
    'descripcion': '',
})
print('Andina x caja:', r.status_code, r.text[:200])
