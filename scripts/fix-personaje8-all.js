/**
 * Script para corregir imágenes de personaje8
 *
 * Patrón: personaje8 (srcset inverso)
 * - PC: 125px
 * - Móvil: 200px
 * - Sufijo: -desktop.webp
 * - srcset: "{img}-desktop.webp 125w, {img}.webp 200w"
 * - sizes: "(max-width: 900px) 200px, 125px"
 *
 * Páginas afectadas: /one-piece/, /futbol/
 * (/anime/ ya está corregida)
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

// Páginas con personaje8 pendientes de corregir
const PAGES_TO_PROCESS = [
  'one-piece/index.astro',
  'futbol/index.astro'
];

let stats = {
  pagesProcessed: 0,
  imagesFound: 0,
  imagesProcessed: 0,
  desktopCreated: 0,
  htmlChanges: 0,
  bytesOriginal: 0,
  bytesNew: 0,
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

// Extraer imágenes de personaje8 SIN srcset
function extractPersonaje8ImagesWithoutSrcset(html) {
  const images = [];

  // Buscar imágenes dentro de <a class="personaje8"> que NO tengan srcset
  const regex = /<a class="personaje8"[^>]*>\s*<img([^>]*)src="([^"]+)"([^>]*)>/g;

  let match;
  while ((match = regex.exec(html)) !== null) {
    const beforeSrc = match[1];
    const src = match[2];
    const afterSrc = match[3];
    const fullImgTag = match[0];

    // Solo procesar si NO tiene srcset
    if (!beforeSrc.includes('srcset=') && !afterSrc.includes('srcset=')) {
      if (src.startsWith('/uploads/')) {
        images.push({
          fullMatch: fullImgTag,
          src: src,
          relativePath: src.replace('/uploads/', '')
        });
      }
    }
  }

  return images;
}

// Procesar imagen: comprimir y crear versión desktop
async function processImage(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);

  if (!await fileExists(inputPath)) {
    return { path: relativePath, error: 'No existe' };
  }

  const dir = path.dirname(inputPath);
  const ext = path.extname(relativePath);
  const base = path.basename(relativePath, ext);

  // Solo procesar WebP
  if (ext.toLowerCase() !== '.webp') {
    return { path: relativePath, error: 'No es WebP' };
  }

  const desktopPath = path.join(dir, `${base}-desktop.webp`);

  try {
    const originalBuffer = await fs.readFile(inputPath);
    const originalSize = originalBuffer.length;

    let results = {
      path: relativePath,
      originalSize,
      mobileCompressed: false,
      desktopCreated: false,
      totalSaved: 0
    };

    // 1. Comprimir versión móvil (200px)
    const tempPath = path.join(dir, `${base}-temp.webp`);
    await sharp(originalBuffer)
      .resize(200, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(tempPath);

    const tempStats = await fs.stat(tempPath);

    if (tempStats.size < originalSize) {
      const newBuffer = await fs.readFile(tempPath);
      await fs.writeFile(inputPath, newBuffer);
      results.totalSaved += originalSize - tempStats.size;
      results.mobileCompressed = true;
      results.mobileNewSize = tempStats.size;
    } else {
      results.mobileNewSize = originalSize;
    }
    await fs.unlink(tempPath);

    // 2. Crear versión desktop (125px) si no existe
    if (!await fileExists(desktopPath)) {
      await sharp(originalBuffer)
        .resize(125, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(desktopPath);

      const desktopStats = await fs.stat(desktopPath);
      results.desktopCreated = true;
      results.desktopSize = desktopStats.size;
    } else {
      // Verificar si la versión desktop necesita compresión
      const existingDesktopBuffer = await fs.readFile(desktopPath);
      const desktopTempPath = path.join(dir, `${base}-desktop-temp.webp`);

      await sharp(originalBuffer)
        .resize(125, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(desktopTempPath);

      const desktopTempStats = await fs.stat(desktopTempPath);

      if (desktopTempStats.size < existingDesktopBuffer.length) {
        const newDesktopBuffer = await fs.readFile(desktopTempPath);
        await fs.writeFile(desktopPath, newDesktopBuffer);
        results.totalSaved += existingDesktopBuffer.length - desktopTempStats.size;
        results.desktopCompressed = true;
      }
      await fs.unlink(desktopTempPath);

      results.desktopSize = (await fs.stat(desktopPath)).size;
    }

    return results;

  } catch (error) {
    return { path: relativePath, error: error.message };
  }
}

// Actualizar HTML con srcset
function updateHtmlWithSrcset(html, images) {
  let updatedHtml = html;
  let changes = 0;

  for (const img of images) {
    const dir = path.dirname(img.relativePath);
    const ext = path.extname(img.relativePath);
    const base = path.basename(img.relativePath, ext);

    const srcset = `/uploads/${dir}/${base}-desktop.webp 125w, /uploads/${dir}/${base}.webp 200w`;
    const sizes = '(max-width: 900px) 200px, 125px';

    // Escapar caracteres especiales para regex
    const escapedMatch = img.fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Crear nuevo tag con srcset
    let newTag = img.fullMatch;

    // Añadir srcset y sizes antes del cierre
    if (newTag.includes('/>')) {
      newTag = newTag.replace('/>', ` srcset="${srcset}" sizes="${sizes}" />`);
    } else if (newTag.includes('>')) {
      newTag = newTag.replace(/>([^>]*)$/, ` srcset="${srcset}" sizes="${sizes}">$1`);
    }

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
  const images = extractPersonaje8ImagesWithoutSrcset(html);

  if (images.length === 0) {
    console.log('  ✓ Todas las imágenes ya tienen srcset');
    return;
  }

  console.log(`  Encontradas ${images.length} imágenes sin srcset`);
  stats.imagesFound += images.length;

  let pageOriginal = 0;
  let pageSaved = 0;

  // Procesar cada imagen
  for (const img of images) {
    const result = await processImage(img.relativePath);

    if (result.error) {
      stats.errors.push(`${img.relativePath}: ${result.error}`);
      console.log(`  ✗ ${path.basename(img.relativePath)}: ${result.error}`);
    } else {
      stats.imagesProcessed++;
      pageOriginal += result.originalSize;
      pageSaved += result.totalSaved;

      if (result.desktopCreated) {
        stats.desktopCreated++;
        console.log(`  ✓ ${path.basename(img.relativePath)}: desktop creado (${formatBytes(result.desktopSize)})`);
      } else {
        console.log(`  ✓ ${path.basename(img.relativePath)}: verificado`);
      }

      if (result.mobileCompressed) {
        console.log(`    móvil: ${formatBytes(result.originalSize)} → ${formatBytes(result.mobileNewSize)}`);
      }
    }
  }

  stats.bytesOriginal += pageOriginal;
  stats.bytesNew += pageOriginal - pageSaved;

  // Actualizar HTML
  const { html: updatedHtml, changes } = updateHtmlWithSrcset(html, images);

  if (changes > 0) {
    await fs.writeFile(astroFile, updatedHtml);
    stats.htmlChanges += changes;
    console.log(`  📝 HTML: ${changes} cambios`);
  }

  if (pageSaved > 0) {
    console.log(`  💾 Ahorrado: ${formatBytes(pageSaved)}`);
  }

  stats.pagesProcessed++;
}

async function main() {
  console.log('='.repeat(70));
  console.log('CORRECCIÓN DE IMÁGENES PERSONAJE8');
  console.log('='.repeat(70));
  console.log('\nPatrón: srcset inverso (125px desktop, 200px móvil)');

  for (const page of PAGES_TO_PROCESS) {
    await processPage(page);
  }

  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN');
  console.log('='.repeat(70));
  console.log(`Páginas procesadas: ${stats.pagesProcessed}`);
  console.log(`Imágenes encontradas: ${stats.imagesFound}`);
  console.log(`Imágenes procesadas: ${stats.imagesProcessed}`);
  console.log(`Versiones desktop creadas: ${stats.desktopCreated}`);
  console.log(`Cambios en HTML: ${stats.htmlChanges}`);
  console.log(`Espacio ahorrado: ${formatBytes(stats.bytesOriginal - stats.bytesNew)}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️ ERRORES (${stats.errors.length}):`);
    stats.errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n✅ Proceso completado');
}

main().catch(console.error);
