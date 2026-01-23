/**
 * Script MASIVO de optimización de imágenes preview para TODA la web
 *
 * Patrón: preview estándar (class="wv-preview-image")
 * - PC: 1000px
 * - Móvil: 651px
 * - Sufijo: -mobile.webp
 * - srcset: "{img}-mobile.webp 651w, {img}.webp 1000w"
 * - sizes: "(max-width: 850px) 240px, 1000px"
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

// Estadísticas globales
let totalImagesProcessed = 0;
let totalBytesSaved = 0;
let totalMobilesCreated = 0;
let totalHtmlChanges = 0;
let errors = [];

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

// Extraer todas las rutas de imágenes preview de un archivo .astro
async function extractPreviewImages(astroFile) {
  const content = await fs.readFile(astroFile, 'utf-8');
  const images = [];

  // Buscar imágenes con class="wv-preview-image"
  // Patrón: src="/uploads/YYYY/MM/nombre.webp"
  const regex = /src="(\/uploads\/\d{4}\/\d{2}\/[^"]+\.webp)"[^>]*class="wv-preview-image"/g;
  const regex2 = /class="wv-preview-image"[^>]*src="(\/uploads\/\d{4}\/\d{2}\/[^"]+\.webp)"/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const imgPath = match[1].replace('/uploads/', '');
    if (!imgPath.includes('-mobile.webp')) {
      images.push(imgPath);
    }
  }
  while ((match = regex2.exec(content)) !== null) {
    const imgPath = match[1].replace('/uploads/', '');
    if (!imgPath.includes('-mobile.webp') && !images.includes(imgPath)) {
      images.push(imgPath);
    }
  }

  return [...new Set(images)]; // Eliminar duplicados
}

// Comprimir imagen original (sin cambiar tamaño)
async function compressImage(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);

  if (!await fileExists(inputPath)) {
    return { path: relativePath, error: 'No existe', skipped: true };
  }

  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const tempPath = path.join(dir, `${base}-compressed${ext}`);

  try {
    const originalBuffer = await fs.readFile(inputPath);
    const originalSize = originalBuffer.length;

    await sharp(originalBuffer)
      .webp({ quality: QUALITY })
      .toFile(tempPath);

    const newStats = await fs.stat(tempPath);

    if (newStats.size < originalSize) {
      const newBuffer = await fs.readFile(tempPath);
      await fs.writeFile(inputPath, newBuffer);
      await fs.unlink(tempPath);
      return {
        path: relativePath,
        before: originalSize,
        after: newStats.size,
        saved: originalSize - newStats.size
      };
    } else {
      await fs.unlink(tempPath);
      return { path: relativePath, before: originalSize, after: originalSize, saved: 0, skipped: true };
    }
  } catch (error) {
    try { await fs.unlink(tempPath); } catch {}
    return { path: relativePath, error: error.message };
  }
}

// Crear versión móvil (651px)
async function createMobileVersion(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);

  if (!await fileExists(inputPath)) {
    return { path: relativePath, error: 'No existe' };
  }

  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const mobilePath = path.join(dir, `${base}-mobile.webp`);

  // Si ya existe la versión móvil, saltar
  if (await fileExists(mobilePath)) {
    return { path: relativePath, skipped: true, reason: 'Mobile ya existe' };
  }

  try {
    const originalBuffer = await fs.readFile(inputPath);

    await sharp(originalBuffer)
      .resize(651, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(mobilePath);

    const mobileStats = await fs.stat(mobilePath);
    return { path: relativePath, mobilePath: `${base}-mobile.webp`, size: mobileStats.size };
  } catch (error) {
    return { path: relativePath, error: error.message };
  }
}

// Actualizar HTML de un archivo .astro
async function updateHtml(astroFile, images) {
  let html = await fs.readFile(astroFile, 'utf-8');
  let changes = 0;
  const originalHtml = html;

  for (const img of images) {
    const dir = path.dirname(img);
    const ext = path.extname(img);
    const base = path.basename(img, ext);

    // Escapar caracteres especiales para regex
    const escapedDir = dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Patrón para buscar la imagen (varias variantes)
    const patterns = [
      // Patrón 1: src antes de class
      new RegExp(
        `(<img[^>]*src="/uploads/${escapedDir}/${escapedBase}\\.webp"[^>]*class="wv-preview-image"[^>]*)(/>|>)`,
        'g'
      ),
      // Patrón 2: class antes de src
      new RegExp(
        `(<img[^>]*class="wv-preview-image"[^>]*src="/uploads/${escapedDir}/${escapedBase}\\.webp"[^>]*)(/>|>)`,
        'g'
      )
    ];

    for (const pattern of patterns) {
      html = html.replace(pattern, (match, before, closing) => {
        // Si ya tiene srcset, no modificar
        if (match.includes('srcset=')) return match;

        changes++;
        const srcset = `/uploads/${dir}/${base}-mobile.webp 651w, /uploads/${dir}/${base}.webp 1000w`;
        const sizes = '(max-width: 850px) 240px, 1000px';
        return `${before} srcset="${srcset}" sizes="${sizes}"${closing}`;
      });
    }
  }

  if (changes > 0) {
    await fs.writeFile(astroFile, html);
  }

  return changes;
}

async function processPage(astroFile) {
  const relativePath = path.relative(PAGES_DIR, astroFile);

  // Extraer imágenes preview de la página
  const images = await extractPreviewImages(astroFile);

  if (images.length === 0) {
    return { page: relativePath, images: 0, skipped: true };
  }

  let pageBytesSaved = 0;
  let pageMobilesCreated = 0;
  let pageErrors = [];

  // Procesar cada imagen
  for (const img of images) {
    // 1. Comprimir original
    const compressResult = await compressImage(img);
    if (compressResult.error && !compressResult.skipped) {
      pageErrors.push(`Compress ${img}: ${compressResult.error}`);
    } else if (compressResult.saved > 0) {
      pageBytesSaved += compressResult.saved;
      totalImagesProcessed++;
    }

    // 2. Crear versión móvil
    const mobileResult = await createMobileVersion(img);
    if (mobileResult.error) {
      pageErrors.push(`Mobile ${img}: ${mobileResult.error}`);
    } else if (!mobileResult.skipped) {
      pageMobilesCreated++;
      totalMobilesCreated++;
    }
  }

  // 3. Actualizar HTML
  const htmlChanges = await updateHtml(astroFile, images);
  totalHtmlChanges += htmlChanges;

  totalBytesSaved += pageBytesSaved;
  errors.push(...pageErrors);

  return {
    page: relativePath,
    images: images.length,
    bytesSaved: pageBytesSaved,
    mobilesCreated: pageMobilesCreated,
    htmlChanges,
    errors: pageErrors.length
  };
}

// Función recursiva para encontrar archivos .astro
async function findAstroFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findAstroFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.astro')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  console.log('='.repeat(70));
  console.log('OPTIMIZACIÓN MASIVA DE IMÁGENES PREVIEW');
  console.log('='.repeat(70));
  console.log(`\nBuscando archivos .astro en ${PAGES_DIR}...\n`);

  // Encontrar todos los archivos .astro
  const astroFiles = await findAstroFiles(PAGES_DIR);
  console.log(`Encontrados ${astroFiles.length} archivos .astro\n`);

  let processedPages = 0;
  let skippedPages = 0;

  // Procesar cada página
  for (let i = 0; i < astroFiles.length; i++) {
    const astroFile = astroFiles[i];
    const result = await processPage(astroFile);

    if (result.skipped) {
      skippedPages++;
    } else {
      processedPages++;
      // Mostrar progreso cada 10 páginas o si hay cambios significativos
      if (processedPages % 10 === 0 || result.bytesSaved > 100000) {
        console.log(`[${i + 1}/${astroFiles.length}] ${result.page}`);
        console.log(`  └─ ${result.images} imgs, ${formatBytes(result.bytesSaved)} ahorrado, ${result.mobilesCreated} móviles, ${result.htmlChanges} HTML changes`);
      }
    }
  }

  // Resumen final
  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN FINAL');
  console.log('='.repeat(70));
  console.log(`Páginas procesadas: ${processedPages}`);
  console.log(`Páginas sin preview: ${skippedPages}`);
  console.log(`Total imágenes comprimidas: ${totalImagesProcessed}`);
  console.log(`Total móviles creados: ${totalMobilesCreated}`);
  console.log(`Total cambios HTML: ${totalHtmlChanges}`);
  console.log(`Espacio total ahorrado: ${formatBytes(totalBytesSaved)}`);

  if (errors.length > 0) {
    console.log(`\n⚠️ ERRORES (${errors.length}):`);
    // Mostrar solo los primeros 20 errores
    errors.slice(0, 20).forEach(e => console.log(`  - ${e}`));
    if (errors.length > 20) {
      console.log(`  ... y ${errors.length - 20} errores más`);
    }
  }

  console.log('\n✅ Proceso completado');
}

main().catch(console.error);
