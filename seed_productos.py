import requests

BASE = 'https://tiendalarealco.pythonanywhere.com/api'

# Aseo=5  Bebidas=2  Carnes=7  Granos=1  Lacteos=3  Otros=8  Panaderia=4  Snacks=6
productos = [
    # ── CERVEZAS ────────────────────────────────────────────────────────────────
    {'nombre':'Miller Lite x unidad',         'marca':'Miller',          'precio_venta':2500,  'stock':100,'stock_minimo':12,'categoria_id':2},
    {'nombre':'Miller Lite x caja x24',       'marca':'Miller',          'precio_venta':48000, 'stock':20, 'stock_minimo':3, 'categoria_id':2},
    {'nombre':'Aguila x unidad',              'marca':'Aguila',          'precio_venta':2500,  'stock':100,'stock_minimo':12,'categoria_id':2},
    {'nombre':'Aguila x caja x30',            'marca':'Aguila',          'precio_venta':60000, 'stock':20, 'stock_minimo':3, 'categoria_id':2},
    {'nombre':'Costena x unidad',             'marca':'Costena',         'precio_venta':2200,  'stock':100,'stock_minimo':12,'categoria_id':2},
    {'nombre':'Costena x caja x30',           'marca':'Costena',         'precio_venta':55000, 'stock':20, 'stock_minimo':3, 'categoria_id':2},
    {'nombre':'Pilsen x unidad',              'marca':'Pilsen',          'precio_venta':2200,  'stock':60, 'stock_minimo':12,'categoria_id':2},
    {'nombre':'Pilsen x caja x30',            'marca':'Pilsen',          'precio_venta':55000, 'stock':10, 'stock_minimo':2, 'categoria_id':2},
    {'nombre':'Club Colombia x unidad',       'marca':'Club Colombia',   'precio_venta':3500,  'stock':48, 'stock_minimo':6, 'categoria_id':2},
    {'nombre':'Club Colombia x caja x24',     'marca':'Club Colombia',   'precio_venta':72000, 'stock':10, 'stock_minimo':2, 'categoria_id':2},
    {'nombre':'Poker x unidad',               'marca':'Poker',           'precio_venta':2200,  'stock':48, 'stock_minimo':6, 'categoria_id':2},
    {'nombre':'Corona x unidad',              'marca':'Corona',          'precio_venta':5000,  'stock':24, 'stock_minimo':6, 'categoria_id':2},
    {'nombre':'Heineken x unidad',            'marca':'Heineken',        'precio_venta':5500,  'stock':24, 'stock_minimo':6, 'categoria_id':2},
    # ── GASEOSAS ────────────────────────────────────────────────────────────────
    {'nombre':'Colombiana 400ml',             'marca':'Postobon',        'precio_venta':2000,  'stock':50, 'stock_minimo':6, 'categoria_id':2},
    {'nombre':'Manzana Postobon 400ml',       'marca':'Postobon',        'precio_venta':2000,  'stock':50, 'stock_minimo':6, 'categoria_id':2},
    {'nombre':'Bretana 400ml',                'marca':'Postobon',        'precio_venta':2000,  'stock':50, 'stock_minimo':6, 'categoria_id':2},
    {'nombre':'Pony Malta 250ml',             'marca':'Postobon',        'precio_venta':2000,  'stock':30, 'stock_minimo':6, 'categoria_id':2},
    {'nombre':'Hit x vaso 200ml',             'marca':'Postobon',        'precio_venta':1500,  'stock':30, 'stock_minimo':6, 'categoria_id':2},
    {'nombre':'Coca-Cola 400ml',              'marca':'Coca-Cola',       'precio_venta':2500,  'stock':50, 'stock_minimo':6, 'categoria_id':2},
    {'nombre':'Pepsi 400ml',                  'marca':'Pepsi',           'precio_venta':2000,  'stock':30, 'stock_minimo':6, 'categoria_id':2},
    {'nombre':'Sprite 400ml',                 'marca':'Coca-Cola',       'precio_venta':2500,  'stock':30, 'stock_minimo':6, 'categoria_id':2},
    {'nombre':'Agua Cristal 600ml',           'marca':'Cristal',         'precio_venta':1500,  'stock':60, 'stock_minimo':12,'categoria_id':2},
    {'nombre':'Gatorade 500ml',               'marca':'Gatorade',        'precio_venta':3500,  'stock':24, 'stock_minimo':6, 'categoria_id':2},
    {'nombre':'Red Bull 250ml',               'marca':'Red Bull',        'precio_venta':7000,  'stock':24, 'stock_minimo':4, 'categoria_id':2},
    # ── LICORES ─────────────────────────────────────────────────────────────────
    {'nombre':'Ron Medellin 750ml',           'marca':'Ron Medellin',    'precio_venta':38000, 'stock':12, 'stock_minimo':2, 'categoria_id':2},
    {'nombre':'Aguardiente Anejo 750ml',      'marca':'Anejo',           'precio_venta':45000, 'stock':12, 'stock_minimo':2, 'categoria_id':2},
    {'nombre':'Ron Viejo de Caldas 750ml',    'marca':'Viejo de Caldas', 'precio_venta':32000, 'stock':12, 'stock_minimo':2, 'categoria_id':2},
    # ── LACTEOS ─────────────────────────────────────────────────────────────────
    {'nombre':'Leche x litro (bolsa)',        'marca':'Algarra',         'precio_venta':3500,  'stock':30, 'stock_minimo':6, 'categoria_id':3},
    {'nombre':'Yogurt Alpina x vaso',         'marca':'Alpina',          'precio_venta':2500,  'stock':20, 'stock_minimo':4, 'categoria_id':3},
    {'nombre':'Kumis x vaso',                 'marca':'Alpina',          'precio_venta':2500,  'stock':20, 'stock_minimo':4, 'categoria_id':3},
    {'nombre':'Queso Costeno x 250g',         'marca':'',                'precio_venta':7000,  'stock':15, 'stock_minimo':3, 'categoria_id':3},
    {'nombre':'Arequipe x tarro 250g',        'marca':'Alpina',          'precio_venta':6000,  'stock':10, 'stock_minimo':3, 'categoria_id':3},
    # ── GRANOS ──────────────────────────────────────────────────────────────────
    {'nombre':'Arroz Diana x 1kg',            'marca':'Diana',           'precio_venta':4500,  'stock':30, 'stock_minimo':5, 'categoria_id':1},
    {'nombre':'Arroz Diana x 5kg',            'marca':'Diana',           'precio_venta':20000, 'stock':15, 'stock_minimo':3, 'categoria_id':1},
    {'nombre':'Frijol rojo x 500g',           'marca':'',                'precio_venta':5000,  'stock':20, 'stock_minimo':4, 'categoria_id':1},
    {'nombre':'Lenteja x 500g',               'marca':'',                'precio_venta':4000,  'stock':15, 'stock_minimo':3, 'categoria_id':1},
    {'nombre':'Maiz trillado x 500g',         'marca':'',                'precio_venta':3000,  'stock':15, 'stock_minimo':3, 'categoria_id':1},
    {'nombre':'Pasta Doria x 250g',           'marca':'Doria',           'precio_venta':2500,  'stock':20, 'stock_minimo':5, 'categoria_id':1},
    {'nombre':'Azucar x 1kg',                 'marca':'',                'precio_venta':4500,  'stock':20, 'stock_minimo':4, 'categoria_id':1},
    {'nombre':'Sal x 500g',                   'marca':'Refisal',         'precio_venta':1500,  'stock':20, 'stock_minimo':4, 'categoria_id':1},
    {'nombre':'Aceite Girasol x 500ml',       'marca':'Girasol',         'precio_venta':8500,  'stock':15, 'stock_minimo':3, 'categoria_id':1},
    # ── SNACKS ──────────────────────────────────────────────────────────────────
    {'nombre':'Chitos x 38g',                 'marca':'Ramo',            'precio_venta':1500,  'stock':30, 'stock_minimo':6, 'categoria_id':6},
    {'nombre':'Doritos x 35g',                'marca':'Frito-Lay',       'precio_venta':2000,  'stock':30, 'stock_minimo':6, 'categoria_id':6},
    {'nombre':'Papas Margarita x 135g',       'marca':'Margarita',       'precio_venta':4000,  'stock':20, 'stock_minimo':4, 'categoria_id':6},
    {'nombre':'De Todito x 45g',              'marca':'Frito-Lay',       'precio_venta':2000,  'stock':30, 'stock_minimo':6, 'categoria_id':6},
    {'nombre':'Bom Bom Bum x unidad',         'marca':'Colombina',       'precio_venta':800,   'stock':50, 'stock_minimo':10,'categoria_id':6},
    {'nombre':'Galletas Festival x paquete',  'marca':'Noel',            'precio_venta':3000,  'stock':20, 'stock_minimo':4, 'categoria_id':6},
    {'nombre':'Galletas Saltinas x paquete',  'marca':'Noel',            'precio_venta':3500,  'stock':20, 'stock_minimo':4, 'categoria_id':6},
    {'nombre':'Mani con pasas x 100g',        'marca':'',                'precio_venta':2000,  'stock':20, 'stock_minimo':4, 'categoria_id':6},
    {'nombre':'Chocolisto x vaso 33g',        'marca':'Nestle',          'precio_venta':2000,  'stock':20, 'stock_minimo':4, 'categoria_id':6},
    {'nombre':'Nucita x unidad',              'marca':'Colombina',       'precio_venta':1000,  'stock':30, 'stock_minimo':6, 'categoria_id':6},
    # ── ASEO ────────────────────────────────────────────────────────────────────
    {'nombre':'Jabon Protex x barra',         'marca':'Protex',          'precio_venta':4500,  'stock':20, 'stock_minimo':4, 'categoria_id':5},
    {'nombre':'Champu H&S x 200ml',           'marca':'H&S',             'precio_venta':9000,  'stock':12, 'stock_minimo':3, 'categoria_id':5},
    {'nombre':'Papel higienico Familia x4',   'marca':'Familia',         'precio_venta':8000,  'stock':15, 'stock_minimo':3, 'categoria_id':5},
    {'nombre':'Crema dental Colgate 75ml',    'marca':'Colgate',         'precio_venta':5500,  'stock':12, 'stock_minimo':3, 'categoria_id':5},
    {'nombre':'Ariel x 200g',                 'marca':'Ariel',           'precio_venta':4500,  'stock':15, 'stock_minimo':3, 'categoria_id':5},
    {'nombre':'Jabon lavaplatos x barra',     'marca':'Axion',           'precio_venta':3500,  'stock':15, 'stock_minimo':3, 'categoria_id':5},
    {'nombre':'Desodorante Rexona x 90g',     'marca':'Rexona',          'precio_venta':9500,  'stock':10, 'stock_minimo':3, 'categoria_id':5},
    {'nombre':'Alcohol antiseptico 250ml',    'marca':'',                'precio_venta':4000,  'stock':10, 'stock_minimo':3, 'categoria_id':5},
    # ── PANADERIA ───────────────────────────────────────────────────────────────
    {'nombre':'Pan tajado Bimbo x 500g',      'marca':'Bimbo',           'precio_venta':7500,  'stock':10, 'stock_minimo':3, 'categoria_id':4},
    {'nombre':'Pandebono x unidad',           'marca':'',                'precio_venta':2000,  'stock':20, 'stock_minimo':5, 'categoria_id':4},
    {'nombre':'Almojabana x unidad',          'marca':'',                'precio_venta':2000,  'stock':20, 'stock_minimo':5, 'categoria_id':4},
    {'nombre':'Croissant x unidad',           'marca':'',                'precio_venta':2500,  'stock':15, 'stock_minimo':4, 'categoria_id':4},
    {'nombre':'Mogolla integral x unidad',    'marca':'',                'precio_venta':1500,  'stock':15, 'stock_minimo':4, 'categoria_id':4},
    # ── CARNES ──────────────────────────────────────────────────────────────────
    {'nombre':'Pechuga de pollo x libra',     'marca':'',                'precio_venta':10000, 'stock':20, 'stock_minimo':5, 'categoria_id':7},
    {'nombre':'Muslos de pollo x libra',      'marca':'',                'precio_venta':8000,  'stock':20, 'stock_minimo':5, 'categoria_id':7},
    {'nombre':'Carne molida x libra',         'marca':'',                'precio_venta':14000, 'stock':15, 'stock_minimo':4, 'categoria_id':7},
    {'nombre':'Chorizo x unidad',             'marca':'Zenu',            'precio_venta':2500,  'stock':20, 'stock_minimo':4, 'categoria_id':7},
    {'nombre':'Salchicha Zenu x 225g',        'marca':'Zenu',            'precio_venta':6500,  'stock':12, 'stock_minimo':3, 'categoria_id':7},
    # ── OTROS ───────────────────────────────────────────────────────────────────
    {'nombre':'Cigarrillos Marlboro x cajetilla','marca':'Marlboro',     'precio_venta':15000, 'stock':10, 'stock_minimo':3, 'categoria_id':8},
    {'nombre':'Cigarrillos Pielroja x cajetilla','marca':'Pielroja',     'precio_venta':12000, 'stock':10, 'stock_minimo':3, 'categoria_id':8},
    {'nombre':'Pilas AA x2',                  'marca':'Energizer',       'precio_venta':5000,  'stock':10, 'stock_minimo':3, 'categoria_id':8},
    {'nombre':'Encendedor x unidad',          'marca':'',                'precio_venta':2000,  'stock':15, 'stock_minimo':4, 'categoria_id':8},
]

ok = err = 0
for p in productos:
    r = requests.post(f'{BASE}/productos', json=p)
    if r.status_code == 201:
        print(f'  OK  {p["nombre"]}')
        ok += 1
    else:
        print(f'  ERR {p["nombre"]}: {r.text[:80]}')
        err += 1

print(f'\n✓ {ok} productos creados  ✗ {err} errores')
