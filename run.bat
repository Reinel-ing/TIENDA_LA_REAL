@echo off
title Tienda La Real - Sistema de Ventas
echo.
echo ====================================
echo    TIENDA LA REAL - Sistema POS
echo ====================================
echo.
echo Instalando dependencias...
pip install -r requirements.txt -q
echo.
echo Iniciando sistema en http://localhost:5000
echo Presiona Ctrl+C para detener.
echo.
python app.py
pause
