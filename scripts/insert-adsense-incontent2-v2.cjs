/**
 * Script para insertar el tercer banner de AdSense (ad-incontent2)
 * VERSION 2 - Mejorada
 *
 * Ubicaciones:
 * - INDEX: Después del primer párrafo (dentro de despues-de-boton)
 * - Páginas de fondos animados (wv-wallpaper): Después del segundo wv-wallpaper
 *
 * Ejecutar con: node scripts/insert-adsense-incontent2-v2.cjs
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../src/pages');

// HTML del nuevo banner
const adHtml = `<div class="ad-incontent2-container"><div class="ad-incontent2-inner"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-9609544329602409" data-ad-slot="5128923074" data-ad-format="auto" data-full-width-responsive="true"></ins></div></div>`;

let stats = {
  total: 0,
  index: 0,
  wallpapers: 0,
  skipped: 0,
  alreadyHas: 0,
  noMatch: 0,
  lessThan2Wallpapers: 0,
  errors: []
};

/**
 * Procesa la página INDEX específicamente
 */
function processIndex() {
  const filePath = path.join(PAGES_DIR, 'index.astro');
  stats.total++;

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('ad-incontent2-container')) {
      stats.alreadyHas++;
      console.log(`⏭️  INDEX ya tiene el ad`);
      return;
    }

    // En INDEX: insertar después del primer párrafo que está en despues-de-boton
    // Buscar </p>\n\n</div>\n<div class="personajes-anime">
    const pattern = /(<p class="has-base-color[^>]*>.*?<\/p>)\s*\n\n(<\/div>)/s;

    if (pattern.test(content)) {
      content = content.replace(pattern, `$1\n${adHtml}\n\n$2`);
      fs.writeFileSync(filePath, content, 'utf8');
      stats.index++;
      console.log(`✅ INDEX: Insertado después del primer párrafo`);
    } else {
      stats.noMatch++;
      console.log(`⚠️  INDEX: No se encontró el patrón`);
    }
  } catch (error) {
    stats.errors.push({ file: 'index.astro', error: error.message });
  }
}

/**
 * Encuentra la posición del cierre del N-ésimo wv-wallpaper
 * Cada wv-wallpaper tiene la estructura:
 * <div class="wv-wallpaper" ...>
 *   <div class="wv-media">...</div>
 *   <div class="wv-downloads">...</div>
 * </div>
 */
function findWallpaperClosePosition(content, wallpaperNumber) {
  // Encontrar todas las posiciones de apertura de wv-wallpaper
  const openPattern = /<div class="wv-wallpaper"/g;
  let openPositions = [];
  let match;

  while ((match = openPattern.exec(content)) !== null) {
    openPositions.push(match.index);
  }

  if (openPositions.length < wallpaperNumber) {
    return -1;
  }

  // Obtener la posición del wallpaper N
  const wallpaperStartIndex = openPositions[wallpaperNumber - 1];

  // Desde esa posición, necesitamos encontrar el cierre correcto
  // Contando divs abiertos/cerrados
  let depth = 0;
  let i = wallpaperStartIndex;
  let foundStart = false;

  while (i < content.length) {
    // Buscar la próxima etiqueta div
    const nextOpen = content.indexOf('<div', i);
    const nextClose = content.indexOf('</div>', i);

    if (nextClose === -1) break;

    // Si no hay más apertura o el cierre viene antes
    if (nextOpen === -1 || nextClose < nextOpen) {
      if (foundStart) {
        depth--;
        if (depth === 0) {
          // Encontramos el cierre del wv-wallpaper
          return nextClose + 6; // +6 para incluir "</div>"
        }
      }
      i = nextClose + 6;
    } else {
      // Hay una apertura antes del cierre
      if (!foundStart && nextOpen === wallpaperStartIndex) {
        foundStart = true;
        depth = 1;
        i = nextOpen + 4;
      } else if (foundStart) {
        depth++;
        i = nextOpen + 4;
      } else {
        i = nextOpen + 4;
      }
    }
  }

  return -1;
}

/**
 * Procesa páginas con wv-wallpaper (fondos animados)
 * Inserta el ad después del SEGUNDO wv-wallpaper
 */
function processFile(filePath) {
  stats.total++;
  const relativePath = path.relative(PAGES_DIR, filePath);

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Saltar si ya tiene el ad
    if (content.includes('ad-incontent2-container')) {
      stats.alreadyHas++;
      console.log(`⏭️  Ya tiene el ad: ${relativePath}`);
      return;
    }

    // Solo procesar páginas con wv-wallpaper
    if (!content.includes('class="wv-wallpaper"')) {
      stats.skipped++;
      return;
    }

    // Contar cuántos wv-wallpaper hay
    const wallpaperCount = (content.match(/<div class="wv-wallpaper"/g) || []).length;

    if (wallpaperCount < 2) {
      stats.lessThan2Wallpapers++;
      return;
    }

    // Encontrar la posición del cierre del segundo wv-wallpaper
    const secondWallpaperEndPos = findWallpaperClosePosition(content, 2);

    if (secondWallpaperEndPos > 0) {
      // Insertar el ad después del cierre del segundo wallpaper
      const before = content.substring(0, secondWallpaperEndPos);
      const after = content.substring(secondWallpaperEndPos);

      // Verificar qué viene después para formatear bien
      // Puede ser \n\n<div, \n\n<h2, \n<div, etc.
      let newContent;
      if (after.startsWith('\n\n')) {
        newContent = before + '\n' + adHtml + after;
      } else if (after.startsWith('\n')) {
        newContent = before + '\n' + adHtml + after;
      } else {
        newContent = before + '\n' + adHtml + '\n' + after;
      }

      fs.writeFileSync(filePath, newContent, 'utf8');
      stats.wallpapers++;
      console.log(`✅ Wallpapers: ${relativePath}`);
    } else {
      stats.noMatch++;
      console.log(`⚠️  Sin patrón: ${relativePath}`);
    }

  } catch (error) {
    stats.errors.push({ file: relativePath, error: error.message });
    console.error(`❌ Error en ${relativePath}: ${error.message}`);
  }
}

/**
 * Recorre recursivamente el directorio de páginas
 */
function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.astro') && file === 'index.astro') {
      // Saltar index.astro principal (se procesa por separado)
      if (filePath !== path.join(PAGES_DIR, 'index.astro')) {
        processFile(filePath);
      }
    }
  }
}

// Ejecutar
console.log('🚀 Insertando tercer banner AdSense (ad-incontent2) - V2...\n');
console.log('─'.repeat(60) + '\n');

// Primero procesar INDEX
processIndex();

// Luego procesar el resto de páginas
walkDir(PAGES_DIR);

console.log('\n' + '─'.repeat(60));
console.log('\n📊 ESTADÍSTICAS:');
console.log(`   Total archivos procesados: ${stats.total}`);
console.log(`   ✅ INDEX modificado: ${stats.index}`);
console.log(`   ✅ Páginas con wallpapers: ${stats.wallpapers}`);
console.log(`   ⏭️  Ya tenían el ad: ${stats.alreadyHas}`);
console.log(`   ⏭️  Sin wv-wallpaper: ${stats.skipped}`);
console.log(`   ⏭️  Menos de 2 wallpapers: ${stats.lessThan2Wallpapers}`);
console.log(`   ⚠️  Sin patrón reconocido: ${stats.noMatch}`);
console.log(`   ❌ Errores: ${stats.errors.length}`);

if (stats.errors.length > 0) {
  console.log('\n❌ ARCHIVOS CON ERRORES:');
  stats.errors.forEach(e => console.log(`   - ${e.file}: ${e.error}`));
}

console.log('\n✨ Completado!');
