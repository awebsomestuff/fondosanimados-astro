/**
 * Script para insertar AdSenseAfterIntro después del primer párrafo
 * en todas las páginas .astro del sitio
 *
 * Ejecutar con: node scripts/insert-adsense-afterintro.cjs
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../src/pages');

// Estadísticas
let stats = {
  total: 0,
  modified: 0,
  skipped: 0,
  alreadyHas: 0,
  noMatch: 0,
  errors: []
};

// Lista de archivos que no se pudieron procesar automáticamente
let manualReview = [];

/**
 * Determina la ruta del import basándose en el import existente de BaseLayout
 */
function getImportPathFromExisting(content) {
  const baseLayoutMatch = content.match(/import\s+BaseLayout\s+from\s+['"]([^'"]+)['"]/);
  if (baseLayoutMatch) {
    const baseLayoutPath = baseLayoutMatch[1];
    return baseLayoutPath.replace(/layouts\/BaseLayout\.astro$/, 'components/AdSenseAfterIntro.astro');
  }
  return null;
}

/**
 * Inserta el import de AdSenseAfterIntro después del import de BaseLayout
 */
function insertImport(content, importPath) {
  const baseLayoutRegex = /(import\s+BaseLayout\s+from\s+['"][^'"]+['"];?\n)/;
  if (baseLayoutRegex.test(content)) {
    return content.replace(
      baseLayoutRegex,
      `$1import AdSenseAfterIntro from '${importPath}';\n`
    );
  }
  return null;
}

/**
 * Estrategia principal: Buscar el primer </p> dentro del Fragment y dividir ahí
 */
function insertAfterFirstParagraph(content) {
  // Verificar que tenga Fragment set:html
  if (!content.includes('Fragment set:html={`')) {
    return null;
  }

  // Encontrar la posición del inicio del Fragment
  const fragmentStart = content.indexOf('Fragment set:html={`');
  if (fragmentStart === -1) return null;

  // Encontrar el primer </p> después del Fragment
  // Puede ser </p>, </p>\n, </center></p>, </p></div>, etc.
  const afterFragment = content.substring(fragmentStart);

  // Buscar el primer cierre de párrafo completo
  // Patrones comunes: </p>\n, </p></div>, </center></p>\n</div>, </p>\r\n
  const closeParagraphPatterns = [
    /<\/center><\/p>\s*\n<\/div>/,  // </center></p>\n</div>
    /<\/p>\s*\n<\/div>/,             // </p>\n</div>
    /<\/p><\/div>/,                  // </p></div> sin salto
    /<\/p>\s*\n\n/,                  // </p> seguido de línea vacía
    /<\/p>\s*\n(?=<[^\/])/,          // </p> seguido de nueva etiqueta
  ];

  for (const pattern of closeParagraphPatterns) {
    const match = afterFragment.match(pattern);
    if (match) {
      const matchIndex = afterFragment.indexOf(match[0]);
      const absoluteIndex = fragmentStart + matchIndex + match[0].length;

      // Verificar que estamos dentro del Fragment (antes del cierre `})
      const fragmentEndCheck = content.substring(fragmentStart, absoluteIndex);
      if (fragmentEndCheck.includes('`}')) {
        // El Fragment ya cerró, buscar otro patrón
        continue;
      }

      // Dividir el contenido
      const before = content.substring(0, fragmentStart + matchIndex + match[0].length);
      const after = content.substring(fragmentStart + matchIndex + match[0].length);

      // Cerrar el Fragment actual, insertar componente, abrir nuevo Fragment
      const newContent = before.replace(
        /(\s*)(<Fragment\s+set:html=\{`)([^]*?)$/,
        (fullMatch, indent, fragmentOpen, innerContent) => {
          // Encontrar dónde termina el contenido que queremos mantener
          return `${indent}${fragmentOpen}${innerContent}\`} />\n\n${indent}<AdSenseAfterIntro />\n\n${indent}<Fragment set:html={\``;
        }
      ) + after;

      // Verificar que la transformación fue exitosa
      if (newContent.includes('<AdSenseAfterIntro />')) {
        return newContent;
      }
    }
  }

  return null;
}

/**
 * Estrategia alternativa: insertar el HTML del ad directamente dentro del Fragment
 * (para casos donde la división de Fragment es complicada)
 */
function insertAdHtmlDirectly(content) {
  const adHtml = `<div class="ad-afterintro-container"><div class="ad-afterintro-inner"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-9609544329602409" data-ad-slot="2203484639" data-ad-format="auto" data-full-width-responsive="true"></ins></div></div>`;

  // Patrones para encontrar dónde insertar después del primer párrafo
  const insertPatterns = [
    // Después de </center></p>\n</div>
    {
      find: /(<\/center><\/p>\s*\n<\/div>)(<[^`])/,
      replace: `$1\n${adHtml}\n$2`
    },
    // Después de </p>\n</div>
    {
      find: /(<\/p>\s*\n<\/div>)(<div class=")/,
      replace: `$1\n${adHtml}\n$2`
    },
    // Después de </p></div> (sin salto de línea)
    {
      find: /(<\/p><\/div>)(<div class=")/,
      replace: `$1\n${adHtml}\n$2`
    },
    // Después de </p>\n\n seguido de <h2
    {
      find: /(<\/p>)\s*\n\n(<h2)/,
      replace: `$1\n${adHtml}\n\n$2`
    },
    // Después de </p>\n seguido de <h2
    {
      find: /(<\/p>)\s*\n(<h2)/,
      replace: `$1\n${adHtml}\n$2`
    },
    // Después de </p>\n seguido de <a class="elemento
    {
      find: /(<\/p>)\s*\n(<a class="elemento)/,
      replace: `$1\n${adHtml}\n$2`
    },
    // Después de </p>\n seguido de <div class="personajes
    {
      find: /(<\/p>)\s*\n(<div class="personajes)/,
      replace: `$1\n${adHtml}\n$2`
    },
    // Después de </p>\n seguido de <div class="caja
    {
      find: /(<\/p>)\s*\n(<div class="caja)/,
      replace: `$1\n${adHtml}\n$2`
    }
  ];

  for (const pattern of insertPatterns) {
    if (pattern.find.test(content)) {
      // Solo reemplazar la primera ocurrencia
      const newContent = content.replace(pattern.find, pattern.replace);
      if (newContent !== content) {
        return newContent;
      }
    }
  }

  return null;
}

/**
 * Procesa un archivo .astro
 */
function processFile(filePath) {
  stats.total++;
  const relativePath = path.relative(PAGES_DIR, filePath);

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Verificar si ya tiene el componente o el HTML del ad
    if (content.includes('AdSenseAfterIntro') || content.includes('ad-afterintro-container')) {
      stats.alreadyHas++;
      console.log(`⏭️  Ya tiene el ad: ${relativePath}`);
      return;
    }

    // Verificar si tiene Fragment set:html
    if (!content.includes('Fragment set:html')) {
      stats.skipped++;
      console.log(`⏭️  Sin Fragment: ${relativePath}`);
      return;
    }

    // Verificar si tiene un párrafo <p> dentro del Fragment
    const fragmentMatch = content.match(/Fragment set:html=\{`([^`]*)`\}/s);
    if (!fragmentMatch || !/<p[^>]*>/.test(fragmentMatch[1])) {
      stats.skipped++;
      console.log(`⏭️  Sin párrafo en Fragment: ${relativePath}`);
      return;
    }

    // Intentar insertar el HTML del ad directamente (más simple y robusto)
    let newContent = insertAdHtmlDirectly(content);

    if (!newContent) {
      stats.noMatch++;
      manualReview.push(relativePath);
      console.log(`⚠️  Sin patrón reconocido: ${relativePath}`);
      return;
    }

    // Guardar el archivo
    fs.writeFileSync(filePath, newContent, 'utf8');
    stats.modified++;
    console.log(`✅ Modificado: ${relativePath}`);

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
      processFile(filePath);
    }
  }
}

// Ejecutar
console.log('🚀 Iniciando migración de AdSenseAfterIntro...\n');
console.log(`📁 Directorio: ${PAGES_DIR}\n`);
console.log('─'.repeat(60) + '\n');

walkDir(PAGES_DIR);

console.log('\n' + '─'.repeat(60));
console.log('\n📊 ESTADÍSTICAS:');
console.log(`   Total archivos procesados: ${stats.total}`);
console.log(`   ✅ Modificados exitosamente: ${stats.modified}`);
console.log(`   ⏭️  Ya tenían el ad: ${stats.alreadyHas}`);
console.log(`   ⏭️  Saltados (sin Fragment/párrafo): ${stats.skipped}`);
console.log(`   ⚠️  Sin patrón reconocido: ${stats.noMatch}`);
console.log(`   ❌ Errores: ${stats.errors.length}`);

if (stats.errors.length > 0) {
  console.log('\n❌ ARCHIVOS CON ERRORES:');
  stats.errors.forEach(e => console.log(`   - ${e.file}: ${e.error}`));
}

if (manualReview.length > 0) {
  console.log('\n⚠️  ARCHIVOS PARA REVISIÓN MANUAL:');
  manualReview.forEach(f => console.log(`   - ${f}`));
}

console.log('\n✨ Migración completada!');
console.log('\n💡 Recuerda ejecutar "npm run build" para verificar que no hay errores de sintaxis.');
