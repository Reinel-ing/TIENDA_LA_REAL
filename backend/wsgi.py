import sys, os

# Cambia 'tuusuario' por tu usuario real de PythonAnywhere
project_path = os.path.expanduser('~/tienda_la_real')
sys.path.insert(0, project_path)

os.environ.setdefault('DB_PATH', os.path.join(project_path, 'tienda.db'))
os.environ.setdefault('SECRET_KEY', 'tienda-la-real-produccion-2024')

from app import app as application
