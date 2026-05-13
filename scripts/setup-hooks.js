/**
 * scripts/setup-hooks.js
 * 
 * Instala el pre-commit hook en .git/hooks/ copiando el archivo desde hooks/pre-commit.
 * Ejecutar una sola vez con: pnpm setup
 */

const fs   = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const hookSrc  = path.join(repoRoot, 'hooks', 'pre-commit');
const hooksDir = path.join(repoRoot, '.git', 'hooks');
const hookDst  = path.join(hooksDir, 'pre-commit');

// Verificar que existe la carpeta .git/hooks
if (!fs.existsSync(hooksDir)) {
  console.error('❌ No se encontró la carpeta .git/hooks. ¿Estás en la raíz del repositorio?');
  process.exit(1);
}

// Copiar el hook
fs.copyFileSync(hookSrc, hookDst);

// En Linux/Mac, el hook necesita permisos de ejecución
try {
  fs.chmodSync(hookDst, '755');
} catch (_) {
  // En Windows no aplica, se ignora el error
}

console.log('✅ Git hook instalado correctamente en .git/hooks/pre-commit');
console.log('   A partir de ahora, cada "git commit" actualizará la versión automáticamente.');
