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
  const manifestVersion = `${baseVersion}.${dateSuffix}.${timeSuffix}`.replace('v', ''); // Chrome format: 0.1.230513.821
  
  console.log(`Generated version: ${finalVersion}`);

  // 4. Escribir popup/version.js
  const outputPath = path.join(__dirname, '..', 'popup', 'version.js');
  const content = `// Archivo generado automáticamente. No editar manualmente.\nconst APP_VERSION = "${finalVersion}";\n`;
  
  fs.writeFileSync(outputPath, content);
  console.log(`Version written to ${outputPath}`);

  // 5. Sincronizar con manifest.json (CRÍTICO para Chrome Store)
  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = manifestVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`manifest.json version updated to: ${manifestVersion}`);
  }
}

generateVersion();
