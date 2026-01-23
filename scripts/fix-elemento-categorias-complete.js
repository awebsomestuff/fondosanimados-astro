/**
 * Script COMPLETO para corregir TODAS las imágenes elemento-categorias
 *
 * Este script busca CUALQUIER imagen dentro de elemento-categorias que NO tenga srcset
 * y le añade el srcset correcto, creando las versiones de imagen necesarias.
 *
 * Patrón: elemento-categorias (srcset inverso)
 * - PC: 356px
 * - Móvil: 437px
 * - Sufijo: -desktop.webp
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');
const PAGES_DIR = path.join(__dirname, '../src/pages');
const QUALITY = 65;

// Páginas a procesar
const PAGES_TO_PROCESS = [
  'videojuegos/index.astro',
  'series-y-peliculas/index.astro',
  'superheroes/index.astro'
];

// Estadísticas
let stats = {
  pagesProcessed: 0,
  imagesFound: 0,
  imagesProcessed: 0,
  desktopCreated: 0,
  htmlChanges: 0,
  errors: []
};

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Extraer TODAS las imágenes de elemento-categorias SIN srcset
function extractImagesWithoutSrcset(html) {
  const images = [];

  // Buscar bloques elemento-categorias (no elemento-categorias-b)
  const blockRegex = /<div class="elemento-categorias">[\s\S]*?<\/div>/g;
  let blockMatch;

  while ((blockMatch = blockRegex.exec(html)) !== null) {
    const block = blockMatch[0];

    // Buscar imágenes SIN srcset dentro del bloque
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    let imgMatch;

    while ((imgMatch = imgRegex.exec(block)) !== null) {
      const imgTag = imgMatch[0];
      const src = imgMatch[1];

      // Solo procesar si NO tiene srcset
      if (!imgTag.includes('srcset=') && src.startsWith('/uploads/')) {
        images.push({
          fullMatch: imgTag,
          src: src,
          relativePath: src.replace('/uploads/', '')
        });
      }
    }
  }

  return images;
}

// Crear versión desktop (356px) de una imagen
async function createDesktopVersion(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);

  if (!await fileExists(inputPath)) {
    return { error: `No existe: ${relativePath}` };
  }

  const dir = path.dirname(inputPath);
  const ext = path.extname(relativePath);
  const base = path.basename(relativePath, ext);

  // Si es jpg/png, primero convertir a webp
  const isWebp = ext.toLowerCase() === '.webp';
  const webpPath = isWebp ? inputPath : path.join(dir, `${base}.webp`);
  const desktopPath = path.join(dir, `${base}-desktop.webp`);

  try {
    const originalBuffer = await fs.readFile(inputPath);

    // Si no es webp, crear versión webp (437px para móvil)
    if (!isWebp) {
      await sharp(originalBuffer)
        .resize(437, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(webpPath);
    }

    // Crear versión desktop (356px)
    if (!await fileExists(desktopPath)) {
      const sourceBuffer = isWebp ? originalBuffer : await fs.readFile(webpPath);
      await sharp(sourceBuffer)
        .resize(356, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(desktopPath);

      const desktopStats = await fs.stat(desktopPath);
      return {
        created: true,
        desktopPath: `${base}-desktop.webp`,
        size: desktopStats.size,
        wasJpg: !isWebp
      };
    } else {
      return { created: false, reason: 'Desktop ya existe' };
    }
  } catch (error) {
    return { error: error.message };
  }
}

// Actualizar HTML añadiendo srcset a las imágenes
function updateHtmlWithSrcset(html, images) {
  let updatedHtml = html;
  let changes = 0;

  for (const img of images) {
    const dir = path.dirname(img.relativePath);
    const ext = path.extname(img.relativePath);
    const base = path.basename(img.relativePath, ext);

    // Determinar el nuevo src (siempre webp)
    const newSrc = `/uploads/${dir}/${base}.webp`;
    const srcset = `/uploads/${dir}/${base}-desktop.webp 356w, /uploads/${dir}/${base}.webp 437w`;
    const sizes = '(max-width: 900px) 437px, 356px';

    // Escapar el match original para usarlo en regex
    const escapedMatch = img.fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Crear el nuevo tag con srcset
    let newTag = img.fullMatch;

    // Reemplazar src si era jpg/png
    if (ext.toLowerCase() !== '.webp') {
      newTag = newTag.replace(img.src, newSrc);
    }

    // Añadir srcset y sizes antes del cierre del tag
    if (newTag.endsWith('/>')) {
      newTag = newTag.slice(0, -2) + ` srcset="${srcset}" sizes="${sizes}" />`;
    } else if (newTag.endsWith('>')) {
      newTag = newTag.slice(0, -1) + ` srcset="${srcset}" sizes="${sizes}">`;
    }

    // Reemplazar en el HTML
    const regex = new RegExp(escapedMatch, 'g');
    const before = updatedHtml;
    updatedHtml = updatedHtml.replace(regex, newTag);

    if (before !== updatedHtml) {
      changes++;
    }
  }

  return { html: updatedHtml, changes };
}

async function processPage(pageRelativePath) {
  const astroFile = path.join(PAGES_DIR, pageRelativePath);

  if (!await fileExists(astroFile)) {
    console.log(`  ✗ ${pageRelativePath}: No existe`);
    return;
  }

  console.log(`\n📄 ${pageRelativePath}`);
  console.log('-'.repeat(50));

  const html = await fs.readFile(astroFile, 'utf-8');
  const images = extractImagesWithoutSrcset(html);

  if (images.length === 0) {
    console.log('  ✓ Todas las imágenes ya tienen srcset');
    return;
  }

  console.log(`  Encontradas ${images.length} imágenes sin srcset`);
  stats.imagesFound += images.length;

  // Procesar cada imagen
  for (const img of images) {
    const result = await createDesktopVersion(img.relativePath);

    if (result.error) {
      stats.errors.push(`${img.relativePath}: ${result.error}`);
      console.log(`  ✗ ${path.basename(img.relativePath)}: ${result.error}`);
    } else if (result.created) {
      stats.desktopCreated++;
      stats.imagesProcessed++;
      console.log(`  ✓ ${path.basename(img.relativePath)} → desktop creado (${formatBytes(result.size)})`);
    } else {
      stats.imagesProcessed++;
      console.log(`  ○ ${path.basename(img.relativePath)}: ${result.reason}`);
    }
  }

  // Actualizar HTML
  const { html: updatedHtml, changes } = updateHtmlWithSrcset(html, images);

  if (changes > 0) {
    await fs.writeFile(astroFile, updatedHtml);
    stats.htmlChanges += changes;
    console.log(`  📝 HTML: ${changes} cambios`);
  }

  stats.pagesProcessed++;
}

async function main() {
  console.log('='.repeat(70));
  console.log('CORRECCIÓN COMPLETA DE IMÁGENES ELEMENTO-CATEGORIAS');
  console.log('='.repeat(70));
  console.log('\nEste script procesa TODAS las imágenes sin srcset en elemento-categorias');

  for (const page of PAGES_TO_PROCESS) {
    await processPage(page);
  }

  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN');
  console.log('='.repeat(70));
  console.log(`Páginas procesadas: ${stats.pagesProcessed}`);
  console.log(`Imágenes encontradas sin srcset: ${stats.imagesFound}`);
  console.log(`Imágenes procesadas: ${stats.imagesProcessed}`);
  console.log(`Versiones desktop creadas: ${stats.desktopCreated}`);
  console.log(`Cambios en HTML: ${stats.htmlChanges}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️ ERRORES (${stats.errors.length}):`);
    stats.errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n✅ Proceso completado');
}

main().catch(console.error);
