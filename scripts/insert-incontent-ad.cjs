/**
 * Script para insertar anuncio AdSense después del primer wallpaper.
 * Busca el patrón: </div></div><h2> (cierre de wv-downloads + wv-wallpaper + inicio siguiente h2)
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

  // Verificar si tiene al menos un wallpaper
  if (!content.includes('class="wv-wallpaper"')) {
    skippedCount++;
    return false;
  }

  // Buscar el patrón: cierre del primer wv-wallpaper seguido de <h2>
  // El patrón es: </div>\n</div><h2> o </div></div><h2>
  // Necesitamos encontrar el cierre de wv-downloads (</div>) + cierre de wv-wallpaper (</div>) + siguiente <h2>

  // Buscar la primera ocurrencia de </div></div><h2 (con posibles espacios/saltos)
  const regex = /(<\/div>\s*<\/div>)(\s*<h2>)/;
  const match = content.match(regex);

  if (!match) {
    // Intentar otro patrón: puede que haya saltos de línea
    const regex2 = /(<\/div>\s*<\/div>)(\s*<h2)/;
    const match2 = content.match(regex2);

    if (!match2) {
      skippedCount++;
      return false;
    }

    // Insertar el anuncio entre el cierre del wallpaper y el siguiente h2
    const insertPoint = match2.index + match2[1].length;
    content = content.slice(0, insertPoint) + '\n' + adHtml + '\n' + content.slice(insertPoint);

    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  // Insertar el anuncio entre el cierre del wallpaper y el siguiente h2
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

console.log('Insertando anuncios in-content después del primer wallpaper...\n');
walkDir(pagesDir);
console.log(`\n✅ Completado:`);
console.log(`   - ${modifiedCount} archivos modificados`);
console.log(`   - ${skippedCount} sin wallpapers (saltados)`);
console.log(`   - ${alreadyHasAdCount} ya tenían el anuncio`);
