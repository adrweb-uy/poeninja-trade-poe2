# Sistema de Versionado Dinámico

Este proyecto utiliza un sistema de versionado automático para mantener sincronizada la versión visual de la extensión con la versión oficial requerida por la **Chrome Web Store**.

## ¿Cómo funciona?

El script `scripts/gen-version.js` se encarga de generar y actualizar los archivos de versión cada vez que se ejecuta. Utiliza información del sistema, del archivo `package.json` y del historial de Git.

### Formato de la Versión

La versión final sigue el formato:
`v{baseVersion}.{dateSuffix}.{timeSuffix}` (ejemplo: `v0.1.260513.821`)

1.  **`baseVersion`**: Se extrae de `appVersionBase` en el archivo `package.json`. Si no existe, usa `1.0` por defecto.
2.  **`dateSuffix` (YYMMDD)**: Se genera con la fecha actual del sistema al momento de ejecutar el script.
    *   Ejemplo: `260513` para el 13 de mayo de 2026.
3.  **`timeSuffix` (MSS)**: Se basa en la hora del **último commit de Git**.
    *   `M`: Último dígito del minuto del commit.
    *   `SS`: Segundos del commit.
    *   Ejemplo: Si el commit fue a las `10:08:21`, el sufijo es `821`.
    *   *Fallback:* Si no hay un repositorio Git o no hay commits, usa la hora actual del sistema.

## Archivos Actualizados

El script sincroniza automáticamente dos archivos clave:

1.  **`popup/version.js`**: Genera una constante `APP_VERSION` que se utiliza en la interfaz del popup para mostrar la versión al usuario.
2.  **`manifest.json`**: Actualiza el campo `"version"` oficial. Esto es **crítico** para la Chrome Web Store, ya que permite subir actualizaciones sin tener que cambiar el número manualmente.

## Uso en el Desarrollo

Para actualizar la versión del proyecto antes de probarlo o empaquetarlo, ejecuta:

```bash
npm run dev
```

Este comando:
1. Ejecuta el script de versionado.
2. Actualiza los archivos mencionados.
3. Imprime en consola la nueva versión generada.

## Chrome Web Store Compliance

El sistema está diseñado para cumplir con las reglas de la Store:
*   **Formato compatible**: Utiliza una estructura de hasta 4 números separados por puntos (`X.X.X.X`).
*   **Incremento automático**: Al incluir la fecha y el sufijo del commit, la versión siempre será superior a la anterior si se han realizado cambios, permitiendo subidas continuas sin errores de "versión duplicada".

---
*Nota: Este sistema fue implementado para automatizar el flujo de trabajo y asegurar que la UI siempre refleje el estado real del desarrollo.*
