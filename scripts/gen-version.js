const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Genera una versión dinámica basada en la fecha actual y el último commit de Git.
 * Formato: v{base}.{YYMMDD}.{MSS}
 */

function generateVersion() {
  // 1. Obtener baseVersion de package.json
  const pkgPath = path.join(__dirname, '..', 'package.json');
  let baseVersion = '1.0';
  
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    baseVersion = pkg.appVersionBase || pkg.version || '1.0';
  }

  // 2. Calcular dateSuffix (YYMMDD)
  const now = new Date();
  const YY = String(now.getFullYear()).slice(-2);
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const dateSuffix = `${YY}${MM}${DD}`;

  // 3. Obtener timeSuffix (MSS) desde el último commit git
  let commitDate;
  try {
    const gitDateStr = execSync('git log -1 --format=%cd --date=iso-strict', { stdio: 'pipe' }).toString().trim();
    commitDate = new Date(gitDateStr);
    console.log(`Git commit date found: ${gitDateStr}`);
  } catch (error) {
    console.log('No git repository or no commits found, using fallback (current time).');
    commitDate = now;
  }

  const minuteLastDigit = String(commitDate.getMinutes()).slice(-1);
  const seconds = String(commitDate.getSeconds()).padStart(2, '0');
  const timeSuffix = `${minuteLastDigit}${seconds}`;

  const finalVersion = `v${baseVersion}.${dateSuffix}.${timeSuffix}`;
  
  // 4. Calcular manifestVersion (Técnica, para Chrome Store: máx 65535 por parte)
  // Usamos: Base.(YY*1000+DayOfYear).SegundosDelDía/2 (para que quepa en 65535 y siempre aumente entre días)
  const baseParts = baseVersion.split('.').map(n => parseInt(n) || 0);
  const safeManifestVersion = [...baseParts];
  
  // Aseguramos que tenga máximo 4 partes y que sean números válidos
  if (safeManifestVersion.length < 3) {
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const yy = now.getFullYear() % 100;
    safeManifestVersion.push(yy * 1000 + dayOfYear);
  }
  if (safeManifestVersion.length < 4) {
    const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    safeManifestVersion.push(Math.floor(totalSeconds / 2));
  }
  const manifestVersion = safeManifestVersion.slice(0, 4).join('.');
  
  console.log(`Display version: ${finalVersion}`);
  console.log(`Technical manifest version: ${manifestVersion}`);

  // 5. Escribir popup/version.js
  const outputPath = path.join(__dirname, '..', 'popup', 'version.js');
  const content = `// Archivo generado automáticamente. No editar manualmente.\nconst APP_VERSION = "${finalVersion}";\n`;
  
  fs.writeFileSync(outputPath, content);
  console.log(`Version written to ${outputPath}`);

  // 6. Sincronizar con manifest.json (CRÍTICO para Chrome Store)
  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = manifestVersion;
    manifest.version_name = finalVersion; // Esta es la que verán los usuarios en la Store
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`manifest.json updated: version=${manifestVersion}, version_name=${finalVersion}`);
  }
}

generateVersion();
