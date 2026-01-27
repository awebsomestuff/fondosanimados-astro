/**
 * Script para insertar AdSenseAfterIntro después del H1
 * en páginas específicas que no tienen párrafo introductorio
 *
 * Ejecutar con: node scripts/insert-adsense-after-h1.cjs
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../src/pages');

// Lista de archivos a procesar (los que no se procesaron en la migración anterior)
const FILES_TO_PROCESS = [
  'index.astro',
  'animales/index.astro',
  'colores/index.astro',
  'crypto/index.astro',
  'cuphead/index.astro',
  'fairy-tail/index.astro',
  'league-of-legends/ivern/index.astro',
  'league-of-legends/kayle/index.astro',
  'league-of-legends/leona/index.astro',
  'medios-de-transporte/index.astro',
  'montanas/index.astro',
  'my-hero-academia/index.astro',
  'overwatch/index.astro'
];

const adHtml = `<div class="ad-afterintro-container"><div class="ad-afterintro-inner"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-9609544329602409" data-ad-slot="2203484639" data-ad-format="auto" data-full-width-responsive="true"></ins></div></div>`;

let stats = {
  modified: 0,
  alreadyHas: 0,
  errors: []
};

function processFile(relativePath) {
  const filePath = path.join(PAGES_DIR, relativePath);

  try {
    if (!fs.existsSync(filePath)) {
      stats.errors.push({ file: relativePath, error: 'Archivo no existe' });
      console.log(`❌ No existe: ${relativePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Verificar si ya tiene el ad
    if (content.includes('ad-afterintro-container')) {
      stats.alreadyHas++;
      console.log(`⏭️  Ya tiene el ad: ${relativePath}`);
      return;
    }

    // Buscar el patrón </h1> seguido de contenido dentro del Fragment
    // Patrón: </h1>\n    <Fragment set:html={`
    const pattern1 = /(<\/h1>)\s*\n(\s*<Fragment set:html=\{\`)/;
    if (pattern1.test(content)) {
      content = content.replace(pattern1, `$1\n${adHtml}\n$2`);
      fs.writeFileSync(filePath, content, 'utf8');
      stats.modified++;
      console.log(`✅ Modificado (patrón 1): ${relativePath}`);
      return;
    }

    // Patrón alternativo: </h1>\n dentro del Fragment (el h1 está dentro del Fragment)
    // Buscar </h1> seguido de cualquier contenido dentro del Fragment
    const pattern2 = /(<Fragment set:html=\{\`[^`]*<\/h1>)(\s*\n?\s*)(<[^`])/;
    if (pattern2.test(content)) {
      content = content.replace(pattern2, `$1\n${adHtml}\n$3`);
      fs.writeFileSync(filePath, content, 'utf8');
      stats.modified++;
      console.log(`✅ Modificado (patrón 2): ${relativePath}`);
      return;
    }

    // Patrón 3: H1 como componente Astro seguido de Fragment
    const pattern3 = /(<h1>[^<]*<\/h1>)\s*\n(\s*<Fragment)/;
    if (pattern3.test(content)) {
      content = content.replace(pattern3, `$1\n\n${adHtml}\n\n$2`);
      fs.writeFileSync(filePath, content, 'utf8');
      stats.modified++;
      console.log(`✅ Modificado (patrón 3): ${relativePath}`);
      return;
    }

    stats.errors.push({ file: relativePath, error: 'No se encontró patrón de H1' });
    console.log(`⚠️  Sin patrón reconocido: ${relativePath}`);

  } catch (error) {
    stats.errors.push({ file: relativePath, error: error.message });
    console.error(`❌ Error en ${relativePath}: ${error.message}`);
  }
}

// Ejecutar
console.log('🚀 Insertando ad después del H1 en páginas específicas...\n');
console.log('─'.repeat(60) + '\n');

FILES_TO_PROCESS.forEach(file => processFile(file));

console.log('\n' + '─'.repeat(60));
console.log('\n📊 ESTADÍSTICAS:');
console.log(`   ✅ Modificados: ${stats.modified}`);
console.log(`   ⏭️  Ya tenían el ad: ${stats.alreadyHas}`);
console.log(`   ❌ Errores/Sin patrón: ${stats.errors.length}`);

if (stats.errors.length > 0) {
  console.log('\n⚠️  ARCHIVOS CON PROBLEMAS:');
  stats.errors.forEach(e => console.log(`   - ${e.file}: ${e.error}`));
}

console.log('\n✨ Completado!');
