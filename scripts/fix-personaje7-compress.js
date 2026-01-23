/**
 * Script para verificar/comprimir imágenes de personaje7
 *
 * Patrón: personaje7 (srcset inverso)
 * - PC: 145px
 * - Móvil: 200px
 * - Sufijo: -desktop.webp
 * - srcset: "{img}-desktop.webp 145w, {img}.webp 200w"
 * - sizes: "(max-width: 900px) 200px, 145px"
 *
 * Páginas afectadas: /chainsaw-man/ (única)
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

// Páginas con personaje7
const PAGES_TO_PROCESS = [
  'chainsaw-man/index.astro'
];

let stats = {
  imagesFound: 0,
  imagesCompressed: 0,
  desktopCreated: 0,
  bytesOriginal: 0,
  bytesNew: 0,
  skipped: 0,
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

// Extraer imágenes de personaje7 de una página
function extractPersonaje7Images(html) {
  const images = [];

  // Buscar imágenes dentro de <a class="personaje7">
  const regex = /<a class="personaje7"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>/g;

  let match;
  while ((match = regex.exec(html)) !== null) {
    let src = match[1];
    // Normalizar barras invertidas a barras normales
    src = src.replace(/\\/g, '/');
    if (src.startsWith('/uploads/')) {
      images.push(src.replace('/uploads/', ''));
    }
  }

  return [...new Set(images)];
}

// Comprimir y crear versión desktop si no existe
async function processImage(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);

  if (!await fileExists(inputPath)) {
    return { path: relativePath, error: 'No existe' };
  }

  // Solo procesar WebP
  if (!relativePath.toLowerCase().endsWith('.webp')) {
    return { path: relativePath, skipped: true, reason: 'No es WebP' };
  }

  const dir = path.dirname(inputPath);
  const base = path.basename(relativePath, '.webp');
  const desktopPath = path.join(dir, `${base}-desktop.webp`);

  try {
    const originalBuffer = await fs.readFile(inputPath);
    const originalSize = originalBuffer.length;
    let totalSaved = 0;
    let results = { path: relativePath, originalSize };

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
      totalSaved += originalSize - tempStats.size;
      results.mobileCompressed = true;
      results.mobileNewSize = tempStats.size;
    } else {
      results.mobileCompressed = false;
      results.mobileNewSize = originalSize;
    }
    await fs.unlink(tempPath);

    // 2. Crear/comprimir versión desktop (145px)
    const desktopExists = await fileExists(desktopPath);
    let desktopOriginalSize = 0;

    if (desktopExists) {
      const desktopBuffer = await fs.readFile(desktopPath);
      desktopOriginalSize = desktopBuffer.length;
    }

    // Crear versión desktop desde el original (no del comprimido)
    const desktopTempPath = path.join(dir, `${base}-desktop-temp.webp`);
    await sharp(originalBuffer)
      .resize(145, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(desktopTempPath);

    const desktopTempStats = await fs.stat(desktopTempPath);

    if (!desktopExists || desktopTempStats.size < desktopOriginalSize) {
      const desktopNewBuffer = await fs.readFile(desktopTempPath);
      await fs.writeFile(desktopPath, desktopNewBuffer);
      if (desktopExists) {
        totalSaved += desktopOriginalSize - desktopTempStats.size;
      }
      results.desktopCreated = !desktopExists;
      results.desktopCompressed = desktopExists;
      results.desktopNewSize = desktopTempStats.size;
    } else {
      results.desktopCompressed = false;
      results.desktopNewSize = desktopOriginalSize;
    }
    await fs.unlink(desktopTempPath);

    results.totalSaved = totalSaved;
    return results;

  } catch (error) {
    return { path: relativePath, error: error.message };
  }
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
  const images = extractPersonaje7Images(html);

  if (images.length === 0) {
    console.log('  Sin imágenes personaje7');
    return;
  }

  console.log(`  Encontradas ${images.length} imágenes`);
  stats.imagesFound += images.length;

  for (const img of images) {
    const result = await processImage(img);

    if (result.error) {
      stats.errors.push(`${img}: ${result.error}`);
      console.log(`  ✗ ${path.basename(img)}: ${result.error}`);
    } else if (result.skipped) {
      stats.skipped++;
      console.log(`  ○ ${path.basename(img)}: ${result.skipped}`);
    } else {
      stats.imagesCompressed++;
      if (result.desktopCreated) stats.desktopCreated++;
      stats.bytesOriginal += result.originalSize;
      stats.bytesNew += (result.mobileNewSize || result.originalSize) + (result.desktopNewSize || 0);

      let status = [];
      if (result.mobileCompressed) status.push('móvil comprimido');
      if (result.desktopCreated) status.push('desktop creado');
      if (result.desktopCompressed) status.push('desktop comprimido');

      if (status.length > 0 || result.totalSaved > 0) {
        console.log(`  ✓ ${path.basename(img)}: ${status.join(', ') || 'verificado'} (${result.totalSaved > 0 ? '-' + formatBytes(result.totalSaved) : 'sin cambios'})`);
      } else {
        console.log(`  ○ ${path.basename(img)}: ya optimizado`);
      }
    }
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('VERIFICACIÓN/COMPRESIÓN DE IMÁGENES PERSONAJE7');
  console.log('='.repeat(70));
  console.log('\nPatrón: srcset inverso (145px desktop, 200px móvil)');

  for (const page of PAGES_TO_PROCESS) {
    await processPage(page);
  }

  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN');
  console.log('='.repeat(70));
  console.log(`Imágenes encontradas: ${stats.imagesFound}`);
  console.log(`Imágenes procesadas: ${stats.imagesCompressed}`);
  console.log(`Versiones desktop creadas: ${stats.desktopCreated}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️ ERRORES (${stats.errors.length}):`);
    stats.errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n✅ Proceso completado');
}

main().catch(console.error);
