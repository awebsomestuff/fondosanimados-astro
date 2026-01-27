/**
 * Script para insertar el tercer banner de AdSense (ad-incontent2)
 * VERSION 3 - Lógica corregida
 *
 * LÓGICA:
 * 1. INDEX: Después del primer párrafo (ya hecho manualmente)
 * 2. Páginas CON GALERÍA: Después de la primera galería
 *    - Clases de galería: personaje, personaje6, personaje7, personaje8, elemento-categorias
 * 3. Páginas SIN GALERÍA pero con wallpapers: Después del segundo wv-wallpaper
 *
 * Ejecutar con: node scripts/insert-adsense-incontent2-v3.cjs
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../src/pages');

// HTML del nuevo banner
const adHtml = `<div class="ad-incontent2-container"><div class="ad-incontent2-inner"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-9609544329602409" data-ad-slot="5128923074" data-ad-format="auto" data-full-width-responsive="true"></ins></div></div>`;

// Clases que identifican galerías
const GALLERY_CLASSES = [
  'class="personaje"',
  'class="personaje6"',
  'class="personaje7"',
  'class="personaje8"',
  'class="elemento-categorias"',
  'class="elemento-categorias-b"'
];

let stats = {
  total: 0,
  withGallery: 0,
  withWallpaperOnly: 0,
  skipped: 0,
  alreadyHas: 0,
  noMatch: 0,
  lessThan2Wallpapers: 0,
  errors: []
};

/**
 * Verifica si una página tiene alguna galería
 */
function hasGallery(content) {
  return GALLERY_CLASSES.some(cls => content.includes(cls));
}

/**
 * Encuentra el cierre del primer bloque de galería
 * Estrategia mejorada que maneja:
 * 1. Galerías dentro de div contenedor (personajes-anime, etc.)
 * 2. Galerías sueltas (elemento-categorias directamente)
 */
function findGalleryEndPosition(content) {
  // Buscar la primera ocurrencia de cualquier clase de galería
  let firstGalleryIndex = -1;
  let firstGalleryClass = null;

  for (const cls of GALLERY_CLASSES) {
    const idx = content.indexOf(cls);
    if (idx !== -1 && (firstGalleryIndex === -1 || idx < firstGalleryIndex)) {
      firstGalleryIndex = idx;
      firstGalleryClass = cls;
    }
  }

  if (firstGalleryIndex === -1) return -1;

  // ESTRATEGIA 1: Buscar contenedor div que envuelve la galería
  const beforeGallery = content.substring(0, firstGalleryIndex);
  const containerPatterns = [
    '<div class="personajes-anime">',
    '<div class="personajes-peli">',
    '<div class="personajes-videojuegos">',
    '<div class="contenedor-categorias-b">'
  ];

  let containerStart = -1;
  for (const pattern of containerPatterns) {
    const idx = beforeGallery.lastIndexOf(pattern);
    if (idx !== -1 && (containerStart === -1 || idx > containerStart)) {
      containerStart = idx;
    }
  }

  // Si hay contenedor, buscar su cierre
  if (containerStart !== -1) {
    const afterContainer = content.substring(containerStart);
    let depth = 0;
    let i = 0;
    let foundStart = false;

    while (i < afterContainer.length) {
      const nextOpen = afterContainer.indexOf('<div', i);
      const nextClose = afterContainer.indexOf('</div>', i);

      if (nextClose === -1) break;

      if (nextOpen === -1 || nextClose < nextOpen) {
        if (foundStart) {
          depth--;
          if (depth === 0) {
            return containerStart + nextClose + 6;
          }
        }
        i = nextClose + 6;
      } else {
        if (!foundStart && nextOpen === 0) {
          foundStart = true;
          depth = 1;
        } else if (foundStart) {
          depth++;
        }
        i = nextOpen + 4;
      }
    }
  }

  // ESTRATEGIA 2: Galerías sueltas (elemento-categorias, etc.)
  // Buscar el último </a> de la galería seguido de algo que no es galería
  const afterFirstGallery = content.substring(firstGalleryIndex);

  // Buscar patrones que indican fin de galería suelta
  const endPatterns = [
    // </a>\n<div class="despues-de-boton">
    { regex: /<\/a>\s*\n<div class="despues-de-boton">/, getEnd: (m) => m.index + '</a>'.length },
    // </a></div>\n<div class="despues-de-boton">
    { regex: /<\/a><\/div>\s*\n<div class="despues-de-boton">/, getEnd: (m) => m.index + '</a></div>'.length },
    // </a>\n<h2 o </a>\n\n<h2
    { regex: /<\/a>\s*\n\n?<h2/, getEnd: (m) => m.index + '</a>'.length },
    // </a></div>\n<h2
    { regex: /<\/a><\/div>\s*\n<h2/, getEnd: (m) => m.index + '</a></div>'.length },
    // </a></div>\n\n<h2
    { regex: /<\/a><\/div>\s*\n\n<h2/, getEnd: (m) => m.index + '</a></div>'.length },
  ];

  for (const { regex, getEnd } of endPatterns) {
    const match = afterFirstGallery.match(regex);
    if (match) {
      return firstGalleryIndex + getEnd(match);
    }
  }

  return -1;
}

/**
 * Encuentra la posición del cierre del N-ésimo wv-wallpaper
 */
function findWallpaperClosePosition(content, wallpaperNumber) {
  const openPattern = /<div class="wv-wallpaper"/g;
  let openPositions = [];
  let match;

  while ((match = openPattern.exec(content)) !== null) {
    openPositions.push(match.index);
  }

  if (openPositions.length < wallpaperNumber) {
    return -1;
  }

  const wallpaperStartIndex = openPositions[wallpaperNumber - 1];

  let depth = 0;
  let i = wallpaperStartIndex;
  let foundStart = false;

  while (i < content.length) {
    const nextOpen = content.indexOf('<div', i);
    const nextClose = content.indexOf('</div>', i);

    if (nextClose === -1) break;

    if (nextOpen === -1 || nextClose < nextOpen) {
      if (foundStart) {
        depth--;
        if (depth === 0) {
          return nextClose + 6;
        }
      }
      i = nextClose + 6;
    } else {
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
 * Inserta el ad en la posición indicada
 */
function insertAdAtPosition(content, position) {
  const before = content.substring(0, position);
  const after = content.substring(position);

  // Formatear bien según lo que viene después
  if (after.startsWith('\n\n')) {
    return before + '\n' + adHtml + after;
  } else if (after.startsWith('\n')) {
    return before + '\n' + adHtml + after;
  } else {
    return before + '\n' + adHtml + '\n' + after;
  }
}

/**
 * Procesa un archivo
 */
function processFile(filePath) {
  stats.total++;
  const relativePath = path.relative(PAGES_DIR, filePath);

  // Saltar index principal
  if (filePath === path.join(PAGES_DIR, 'index.astro')) {
    stats.skipped++;
    console.log(`⏭️  Index principal (ya configurado): ${relativePath}`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Saltar si ya tiene el ad
    if (content.includes('ad-incontent2-container')) {
      stats.alreadyHas++;
      console.log(`⏭️  Ya tiene el ad: ${relativePath}`);
      return;
    }

    // Verificar si tiene galería
    const hasGal = hasGallery(content);

    // Verificar si tiene wallpapers
    const hasWallpapers = content.includes('class="wv-wallpaper"');
    const wallpaperCount = hasWallpapers ? (content.match(/<div class="wv-wallpaper"/g) || []).length : 0;

    if (hasGal) {
      // CASO 1: Página con galería -> insertar después de la galería
      const galleryEndPos = findGalleryEndPosition(content);

      if (galleryEndPos > 0) {
        content = insertAdAtPosition(content, galleryEndPos);
        fs.writeFileSync(filePath, content, 'utf8');
        stats.withGallery++;
        console.log(`✅ Galería: ${relativePath}`);
      } else {
        stats.noMatch++;
        console.log(`⚠️  Galería sin patrón: ${relativePath}`);
      }
    } else if (hasWallpapers && wallpaperCount >= 2) {
      // CASO 2: Sin galería, con 2+ wallpapers -> después del segundo wallpaper
      const secondWallpaperEnd = findWallpaperClosePosition(content, 2);

      if (secondWallpaperEnd > 0) {
        content = insertAdAtPosition(content, secondWallpaperEnd);
        fs.writeFileSync(filePath, content, 'utf8');
        stats.withWallpaperOnly++;
        console.log(`✅ Wallpapers: ${relativePath}`);
      } else {
        stats.noMatch++;
        console.log(`⚠️  Wallpapers sin patrón: ${relativePath}`);
      }
    } else if (hasWallpapers && wallpaperCount < 2) {
      stats.lessThan2Wallpapers++;
      // No loguear para no saturar
    } else {
      stats.skipped++;
      // No loguear para no saturar
    }

  } catch (error) {
    stats.errors.push({ file: relativePath, error: error.message });
    console.error(`❌ Error en ${relativePath}: ${error.message}`);
  }
}

/**
 * Recorre recursivamente el directorio
 */
function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.astro') && file === 'index.astro') {
      processFile(filePath);
    }
  }
}

// Ejecutar
console.log('🚀 Insertando tercer banner AdSense (ad-incontent2) - V3...\n');
console.log('📋 Lógica:');
console.log('   1. Páginas con galería → después de la galería');
console.log('   2. Páginas sin galería con 2+ wallpapers → después del 2do wallpaper\n');
console.log('─'.repeat(60) + '\n');

walkDir(PAGES_DIR);

console.log('\n' + '─'.repeat(60));
console.log('\n📊 ESTADÍSTICAS:');
console.log(`   Total archivos procesados: ${stats.total}`);
console.log(`   ✅ Con galería (después de galería): ${stats.withGallery}`);
console.log(`   ✅ Sin galería (después 2do wallpaper): ${stats.withWallpaperOnly}`);
console.log(`   ⏭️  Ya tenían el ad: ${stats.alreadyHas}`);
console.log(`   ⏭️  Saltados (index, sin contenido): ${stats.skipped}`);
console.log(`   ⏭️  Menos de 2 wallpapers (sin galería): ${stats.lessThan2Wallpapers}`);
console.log(`   ⚠️  Sin patrón reconocido: ${stats.noMatch}`);
console.log(`   ❌ Errores: ${stats.errors.length}`);

const totalModified = stats.withGallery + stats.withWallpaperOnly;
console.log(`\n   📈 TOTAL MODIFICADOS: ${totalModified}`);

if (stats.errors.length > 0) {
  console.log('\n❌ ARCHIVOS CON ERRORES:');
  stats.errors.forEach(e => console.log(`   - ${e.file}: ${e.error}`));
}

console.log('\n✨ Completado!');
