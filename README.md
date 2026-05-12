# poe.ninja → POE2 Trade

Chrome Extension que agrega un botón de búsqueda en cada ítem de equipamiento en [poe.ninja](https://poe.ninja/) para buscarlo directamente en el [mercado oficial de Path of Exile 2](https://www.pathofexile.com/trade2).

## 📸 Características

- Botón 🔍 en cada slot de equipamiento al hacer hover
- Búsqueda automática en el trade de POE2 (abre nueva tab)
- Configuración por popup: liga, modo de búsqueda, auto-abrir
- Compatible con navegación SPA de poe.ninja (Astro)
- Tema oscuro acorde al diseño de poe.ninja

## 🚀 Instalación (modo desarrollador)

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/TU_USUARIO/poeninja-trade-poe2.git
   ```

2. Abrir Chrome y navegar a `chrome://extensions`

3. Activar **"Modo desarrollador"** (esquina superior derecha)

4. Hacer clic en **"Cargar descomprimida"**

5. Seleccionar la carpeta del repositorio clonado

6. ✅ La extensión ya está activa

## ⚙️ Configuración

Hacer clic en el ícono de la extensión en la barra de Chrome para abrir el popup de configuración:

| Opción | Descripción |
|--------|-------------|
| **Liga activa** | Liga de POE2 donde buscar (Standard, Mercenaries, etc.) |
| **Modo de búsqueda** | Solo nombre del ítem o nombre + tipo base |
| **Abrir tab automáticamente** | Abre la búsqueda en una nueva pestaña al hacer clic |

## 🔧 Uso

1. Navegar a cualquier perfil de build en `poe.ninja/builds/...`
2. Hacer hover sobre cualquier slot de equipamiento
3. Hacer clic en el botón 🔍 que aparece
4. Se abrirá una nueva tab con la búsqueda en `pathofexile.com/trade2`

## 🛠️ Estructura del proyecto

```
poeninja-trade-poe2/
├── manifest.json     # Chrome Extension Manifest V3
├── background.js     # Service worker (POST a POE2 Trade API)
├── content.js        # Inyecta botones en poe.ninja
├── content.css       # Estilos del botón
├── popup/
│   ├── popup.html    # UI de configuración
│   ├── popup.js      # Lógica del popup
│   └── popup.css     # Estilos del popup
├── icons/            # Íconos de la extensión
└── README.md
```

## 📝 Notas técnicas

- Usa **Manifest V3** (estándar actual de Chrome)
- El botón se inyecta con `MutationObserver` para soportar la navegación SPA de poe.ninja
- La búsqueda usa la API oficial de GGG: `POST /api/trade2/search/{league}`
- La configuración se persiste con `chrome.storage.sync`

## 📋 Roadmap

- [ ] Soporte para POE1 trade
- [ ] Búsqueda por stats/mods específicos
- [ ] Historial de búsquedas
- [ ] Atajos de teclado
- [ ] Soporte para más páginas de poe.ninja

## 📄 Licencia

MIT
