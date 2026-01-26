/**
 * Script para insertar anuncio AdSense después del primer wallpaper tipo mega-lazy.
 * Busca el patrón: </div><h2> después de su-buttons-wrapper
 * e inserta el bloque de anuncio entre ellos.
 */

const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', 'src', 'pages');
let modifiedCount = 0;
let skippedCount = 0;
let alreadyHasAdCount = 0;

const adHtml = `<div class="ad-incontent-container">
  <ins class="adsbygoogle"
       style="display:block"
       data-ad-client="ca-pub-9609544329602409"
       data-ad-slot="8926458048"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
</div>`;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Verificar si ya tiene el anuncio in-content
  if (content.includes('ad-incontent-container')) {
    alreadyHasAdCount++;
    return false;
  }

  // Verificar si tiene el reproductor mega-lazy (pero NO wv-wallpaper, ya procesados)
  if (!content.includes('class="mega-lazy"')) {
    skippedCount++;
    return false;
  }

  // Si ya tiene wv-wallpaper, ya fue procesado por el otro script
  if (content.includes('class="wv-wallpaper"')) {
    skippedCount++;
    return false;
  }

  // Buscar el patrón: cierre de su-buttons-wrapper seguido de <h2>
  // El patrón es: </div><h2> después de un su-buttons-wrapper
  const regex = /(su-buttons-wrapper[\s\S]*?<\/div>)(\s*<h2)/;
  const match = content.match(regex);

  if (!match) {
    skippedCount++;
    return false;
  }

  // Insertar el anuncio entre el cierre del wrapper y el siguiente h2
  const insertPoint = match.index + match[1].length;
  content = content.slice(0, insertPoint) + '\n' + adHtml + '\n' + content.slice(insertPoint);

  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.astro')) {
      const modified = processFile(filePath);
      if (modified) {
        modifiedCount++;
        console.log(`✓ Modificado: ${filePath.replace(pagesDir, '')}`);
      }
    }
  }
}

console.log('Insertando anuncios in-content después del primer wallpaper mega-lazy...\n');
walkDir(pagesDir);
console.log(`\n✅ Completado:`);
console.log(`   - ${modifiedCount} archivos modificados`);
console.log(`   - ${skippedCount} saltados (sin mega-lazy o ya tienen wv-wallpaper)`);
console.log(`   - ${alreadyHasAdCount} ya tenían el anuncio`);
