# Sistema de Versionado Dinámico

Este proyecto utiliza un sistema de versionado automático diseñado para cumplir con las estrictas reglas de la **Chrome Web Store** sin sacrificar una nomenclatura visual informativa para el desarrollador y el usuario.

## ¿Cómo funciona?

El script `scripts/gen-version.js` genera dos tipos de versiones sincronizadas: una **Técnica** (para el sistema) y una **Visual** (para humanos).

### 1. Versión Visual (`version_name`)
Es el formato amigable que verás en la UI de la extensión y en la tienda.
**Formato:** `v{baseVersion}.{dateSuffix}.{timeSuffix}` (ejemplo: `v0.1.260513.727`)

*   **`baseVersion`**: Definida en `package.json` (ej: `0.1`).
*   **`dateSuffix`**: Fecha actual en formato `YYMMDD`.
*   **`timeSuffix`**: Basado en el último dígito del minuto y los segundos del **último commit de Git**.

### 2. Versión Técnica (`version`)
Es el número que Chrome usa para validar actualizaciones. Debe ser puramente numérico, cada parte no puede superar el valor de **65535** y cada versión nueva debe ser matemáticamente mayor a la anterior.
**Formato:** `{baseVersion}.{YY * 1000 + DíaDelAño}.{SegundosDelDía / 2}` (ejemplo: `0.1.26134.18651`)

*   **¿Por qué `{YY * 1000 + DíaDelAño}`?**: Garantiza que el tercer número aumente todos los días (ej. día 134 del año 26 = 26134) y cumple con el límite de 65535 de Chrome. Anteriormente usábamos solo el año (2026), lo que provocaba que la versión retrocediera de un día para el otro si se buildeaba a una hora más temprana.
*   **¿Por qué `/ 2`?**: Un día tiene 86,400 segundos. Al dividir por 2, nos aseguramos de que el número máximo sea 43,200, cumpliendo con el límite de Chrome y garantizando que cada build del mismo día sea superior a la anterior.

## Archivos Actualizados

El script sincroniza automáticamente tres elementos:

1.  **`popup/version.js`**: Exporta la constante `APP_VERSION` con el formato **Visual**.
2.  **`manifest.json` -> `"version"`**: Se actualiza con la versión **Técnica** (obligatorio para subir a la Store).
3.  **`manifest.json` -> `"version_name"`**: Se actualiza con la versión **Visual** (es lo que Chrome muestra al público).

## Uso en el Desarrollo

Para actualizar la versión del proyecto antes de probarlo o empaquetarlo para la Store, ejecuta:

```bash
pnpm dev
```

Este comando garantiza que la extensión sea válida para la Web Store y que la UI refleje el momento exacto del último cambio.

## Reglas de la Chrome Web Store cumplidas:
*   **Valores < 65535**: La parte técnica del año y los segundos cumplen el límite.
*   **Sin ceros a la izquierda**: El script elimina ceros iniciales en las partes técnicas para evitar errores de validación.
*   **Incremento constante**: Al usar el tiempo del sistema/commit, cada nueva subida tendrá un número superior.

---
*Nota: Este sistema dual permite tener lo mejor de ambos mundos: cumplimiento técnico total y una trazabilidad visual clara.*
