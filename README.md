# poe.ninja → POE2 Trade

> Extensión de Chrome que agrega un botón de búsqueda en cada ítem de equipamiento en **poe.ninja**, permitiendo buscarlo directamente en el mercado oficial de **Path of Exile 2** con un solo clic.

---

## 🏪 Chrome Web Store

> 🔗 **[Disponible en la Chrome Web Store](#)** ← *(link disponible próximamente)*

Para instalar la versión estable sin necesidad de configuración técnica, instálala directamente desde la tienda de Chrome.

---

## ✨ Características

### 🔍 Botón de búsqueda en cada slot
Al hacer hover sobre cualquier ítem en poe.ninja, aparece un botón de lupa (🔍) que lanza la búsqueda en el trade de POE2 automáticamente.

### 🗂️ Soporte completo de tipos de equipamiento
La extensión reconoce y categoriza correctamente todos los tipos de ítems:

| Categoría API | Tipos reconocidos |
|---|---|
| `armour.helmet` | Helmet, Hood, Circlet, Mask, Crown, Greathelm, Bascinet, Cap |
| `armour.boots` | Boots, Shoes, Greaves, **Sandals**, Sabatons |
| `armour.gloves` | Gloves, Gauntlets, Mitts, Bracers |
| `armour.chest` | Armour, Garb, Robe, Vest, Regalia, Plate, Tunic, Mail, Doublet, Leathers |
| `armour.shield` | Shield |
| `armour.focus` | Focus |
| `armour.quiver` | Quiver |
| `weapon.*` | Wand, Sceptre, Staff, Bow, Crossbow, Dagger, Sword, Axe, Mace, Flail, Spear |
| `accessory.*` | Amulet, Ring, Belt |
| `jewel` | Jewel |
| `flask` | Flask, Life Flask, Mana Flask |
| `charm` | Charm |

### 🧠 Modos de búsqueda inteligentes
- **Por tipo (categoría)**: Para ítems no únicos, busca por la categoría del ítem (ej. `armour.boots`), ignorando el nombre específico. Evita errores de "Unknown item name".
- **Solo nombre**: Para ítems únicos, busca directamente por el nombre del ítem (ej. "Sekhema Sandals"), lo que da resultados más precisos.
- El modo se selecciona automáticamente según la rareza del ítem detectada.

### ⚙️ Auto-filtros de estadísticas
Cuando está activado, la extensión lee los mods del ítem desde el tooltip de poe.ninja y los incluye como filtros desactivados en la búsqueda, listos para activar selectivamente.

### 🌍 Multi-idioma en el Trade
Abre el sitio de trade en el idioma que prefieras. La búsqueda en sí siempre funciona correctamente ya que usa la API oficial de GGG (que es independiente del idioma).

| Idioma | URL de destino |
|---|---|
| 🇬🇧 English | `www.pathofexile.com/trade2` |
| 🇪🇸 Español | `es.pathofexile.com/trade2` |
| 🇩🇪 Deutsch | `de.pathofexile.com/trade2` |
| 🇫🇷 Français | `fr.pathofexile.com/trade2` |
| 🇧🇷 Português | `pt.pathofexile.com/trade2` |
| 🇷🇺 Русский | `ru.pathofexile.com/trade2` |
| 🇰🇷 한국어 | `ko.pathofexile.com/trade2` |

### 🔄 Compatible con SPA (Single Page Application)
La extensión usa un `MutationObserver` para detectar cambios de ruta en poe.ninja (que usa Astro como framework) y re-inyecta los botones automáticamente al navegar entre builds sin recargar la página.

---

## ⚙️ Panel de configuración

Hacé clic en el ícono de la extensión en la barra de Chrome para abrir el popup:

| Opción | Descripción | Valor por defecto |
|---|---|---|
| **Liga activa** | Liga de POE2 donde buscar ítems | `Fate of the Vaal` |
| **Tipo de listado** | Filtra por disponibilidad del ítem en el trade | `Instant Buyout` |
| **Idioma del Trade** | Idioma en que se abrirá el sitio de trade | `English` |
| **Modo de búsqueda** | Por tipo (categoría) o solo nombre | `Por tipo` |
| **Auto-filtros** | Incluye iLvl y stats del ítem como filtros en la búsqueda | `Activado` |
| **Abrir tab automáticamente** | Abre la pestaña de resultados automáticamente | `Activado` |

### Ligas disponibles
- Fate of the Vaal
- HC Fate of the Vaal
- SSF Fate of the Vaal
- HC SSF Fate of the Vaal
- Standard

---

## 🚀 Instalación (modo desarrollador)

> Solo necesario si querés usar la versión de desarrollo o contribuir al proyecto.
> Para uso normal, usá la **[Chrome Web Store](#)**.

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/adrweb-uy/poeninja-trade-poe2.git
   ```

2. Generar los archivos de versión:
   ```bash
   pnpm dev
   ```

3. Abrir Chrome y navegar a `chrome://extensions`

4. Activar **"Modo desarrollador"** (esquina superior derecha)

5. Hacer clic en **"Cargar descomprimida"** y seleccionar la carpeta del repositorio

6. ✅ La extensión ya está activa

---

## 🔧 Uso

1. Ir a cualquier build en `poe.ninja/builds/...`
2. Hacer **hover** sobre cualquier slot de equipamiento
3. Hacer clic en el botón 🔍 que aparece sobre el ítem
4. Se abrirá una nueva pestaña con la búsqueda en el trade de POE2

---

## 🛠️ Estructura del proyecto

```
poeninja-trade-poe2/
├── manifest.json        # Chrome Extension Manifest V3
├── background.js        # Service worker: POST a POE2 Trade API + apertura de tab
├── content.js           # Inyecta botones en los slots de poe.ninja
├── content.css          # Estilos del botón de búsqueda
├── package.json         # Scripts de desarrollo (gen-version)
├── scripts/
│   └── gen-version.js   # Generador de versión dinámica
├── popup/
│   ├── popup.html       # UI del panel de configuración
│   ├── popup.js         # Lógica del popup
│   ├── popup.css        # Estilos del popup
│   └── version.js       # Constante de versión (auto-generada)
├── icons/               # Íconos de la extensión (16, 48, 128px)
├── VERSIONING.md        # Documentación del sistema de versiones
└── README.md
```

---

## 📝 Notas técnicas

- **Manifest V3**: Cumple con el estándar actual y los requisitos de la Chrome Web Store.
- **Sin código remoto**: Todo el código está empaquetado en la extensión. No se carga código desde servidores externos.
- **API oficial**: Usa el endpoint oficial de GGG: `POST https://www.pathofexile.com/api/trade2/search/poe2/{league}`.
- **Stats matching**: Descarga y cachea la lista de stats oficiales (`/api/trade2/data/stats`) para hacer match de los mods del ítem con los IDs internos de la API.
- **Persistencia**: La configuración se guarda con `chrome.storage.sync`, sincronizándose entre dispositivos con la misma cuenta de Chrome.
- **Versionado dinámico**: El sistema de versiones dual (`version` + `version_name`) cumple con los límites de la Chrome Web Store. Ver [VERSIONING.md](VERSIONING.md).

---

## 📋 Roadmap

- [x] Botón de búsqueda en slots de equipamiento
- [x] Búsqueda por nombre (ítems únicos)
- [x] Búsqueda por categoría (ítems no únicos)
- [x] Auto-filtros de iLvl y stats
- [x] Soporte para frascos y charms
- [x] Soporte para joyas
- [x] Multi-idioma en el Trade
- [x] Sistema de versionado automático compatible con Chrome Store
---

## 👤 Autor

**[AR] Adrian Raineri** — [adrianraineri.com](https://adrianraineri.com)