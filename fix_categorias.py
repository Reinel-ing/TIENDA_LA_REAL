import requests
BASE = 'https://tiendalarealco.pythonanywhere.com/api'

# Ver categorias actuales
cats = requests.get(f'{BASE}/categorias').json()
print("Categorias actuales:")
for c in cats:
    print(f"  id={c['id']}  {c['nombre']}  ({c['total_productos']} productos)")

# Buscar la categoria Bebidas
bebidas = next((c for c in cats if c['nombre'].lower() == 'bebidas'), None)
if bebidas:
    r = requests.put(f"{BASE}/categorias/{bebidas['id']}", json={'nombre': 'Cerveza'})
    print(f"\nRenombrar Bebidas -> Cerveza: {r.status_code}  {r.json()}")
else:
    print("\n[!] No se encontro la categoria Bebidas")

# Crear Gaseosas (si no existe)
existe_gaseosas = any(c['nombre'].lower() == 'gaseosas' for c in cats)
if not existe_gaseosas:
    r = requests.post(f"{BASE}/categorias", json={'nombre': 'Gaseosas'})
    print(f"Crear Gaseosas: {r.status_code}  {r.json()}")
else:
    print("Gaseosas ya existe")

print("\nCategorias finales:")
for c in requests.get(f'{BASE}/categorias').json():
    print(f"  id={c['id']}  {c['nombre']}  ({c['total_productos']} productos)")
