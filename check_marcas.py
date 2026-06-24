import requests
BASE = 'https://tiendalarealco.pythonanywhere.com/api'
prods = requests.get(f'{BASE}/productos').json()
bebidas = [p for p in prods if p['categoria_id'] == 2]
print("Bebidas (id | marca | nombre):")
for p in sorted(bebidas, key=lambda x: x['nombre']):
    print(f"  {p['id']:3d}  marca='{p['marca']}'  {p['nombre']}")
