/**
 * Script para comprimir imágenes de personaje6
 *
 * Patrón: personaje6 (sin srcset, solo compresión)
 * - Tamaño: ~150px (ya son pequeñas)
 * - NO necesita srcset
 * - Solo aplicar compresión quality 65
 *
 * Páginas afectadas:
 * - /attack-on-titan/
 * - /naruto/
 * - /kimetsu-no-yaiba/
 * - /jujutsu-kaisen/
 * - /coches/
 * - /stranger-things/
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

// Páginas con personaje6
const PAGES_TO_PROCESS = [
  'attack-on-titan/index.astro',
  'naruto/index.astro',
  'kimetsu-no-yaiba/index.astro',
  'jujutsu-kaisen/index.astro',
  'coches/index.astro',
  'stranger-things/index.astro'
];

let stats = {
  pagesProcessed: 0,
  imagesFound: 0,
  imagesCompressed: 0,
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

// Extraer imágenes de personaje6 de una página
function extractPersonaje6Images(html) {
  const images = [];

  // Buscar imágenes dentro de <a class="personaje6">
  const regex = /<a class="personaje6"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>/g;

  let match;
  while ((match = regex.exec(html)) !== null) {
    const src = match[1];
    if (src.startsWith('/uploads/')) {
      images.push(src.replace('/uploads/', ''));
    }
  }

  return [...new Set(images)];
}

// Comprimir imagen WebP
async function compressImage(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);

  if (!await fileExists(inputPath)) {
    return { path: relativePath, error: 'No existe' };
  }

  // Solo procesar WebP
  if (!relativePath.toLowerCase().endsWith('.webp')) {
    return { path: relativePath, skipped: true, reason: 'No es WebP' };
  }

  try {
    const originalBuffer = await fs.readFile(inputPath);
    const originalSize = originalBuffer.length;

    // Comprimir a archivo temporal
    const dir = path.dirname(inputPath);
    const base = path.basename(relativePath, '.webp');
    const tempPath = path.join(dir, `${base}-temp.webp`);

    await sharp(originalBuffer)
      .webp({ quality: QUALITY })
      .toFile(tempPath);

    const tempStats = await fs.stat(tempPath);
    const newSize = tempStats.size;

    // Solo reemplazar si es más pequeño
    if (newSize < originalSize) {
      const newBuffer = await fs.readFile(tempPath);
      await fs.writeFile(inputPath, newBuffer);
      await fs.unlink(tempPath);

      return {
        path: relativePath,
        compressed: true,
        originalSize,
        newSize,
        saved: originalSize - newSize
      };
    } else {
      await fs.unlink(tempPath);
      return {
        path: relativePath,
        skipped: true,
        reason: 'Ya optimizada',
        originalSize,
        wouldBe: newSize
      };
    }
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
  const images = extractPersonaje6Images(html);

  if (images.length === 0) {
    console.log('  Sin imágenes personaje6');
    return;
  }

  console.log(`  Encontradas ${images.length} imágenes`);
  stats.imagesFound += images.length;

  let pageOriginal = 0;
  let pageNew = 0;
  let pageCompressed = 0;

  for (const img of images) {
    const result = await compressImage(img);

    if (result.error) {
      stats.errors.push(`${img}: ${result.error}`);
      console.log(`  ✗ ${path.basename(img)}: ${result.error}`);
    } else if (result.skipped) {
      stats.skipped++;
      console.log(`  ○ ${path.basename(img)}: ${result.reason}`);
    } else if (result.compressed) {
      stats.imagesCompressed++;
      pageCompressed++;
      pageOriginal += result.originalSize;
      pageNew += result.newSize;
      stats.bytesOriginal += result.originalSize;
      stats.bytesNew += result.newSize;
      console.log(`  ✓ ${path.basename(img)}: ${formatBytes(result.originalSize)} → ${formatBytes(result.newSize)} (-${formatBytes(result.saved)})`);
    }
  }

  if (pageCompressed > 0) {
    console.log(`  💾 Página: ${formatBytes(pageOriginal - pageNew)} ahorrados`);
  }

  stats.pagesProcessed++;
}

async function main() {
  console.log('='.repeat(70));
  console.log('COMPRESIÓN DE IMÁGENES PERSONAJE6');
  console.log('='.repeat(70));
  console.log('\nPatrón: sin srcset, solo compresión quality 65');

  for (const page of PAGES_TO_PROCESS) {
    await processPage(page);
  }

  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN');
  console.log('='.repeat(70));
  console.log(`Páginas procesadas: ${stats.pagesProcessed}`);
  console.log(`Imágenes encontradas: ${stats.imagesFound}`);
  console.log(`Imágenes comprimidas: ${stats.imagesCompressed}`);
  console.log(`Imágenes ya optimizadas: ${stats.skipped}`);
  console.log(`Tamaño original: ${formatBytes(stats.bytesOriginal)}`);
  console.log(`Tamaño nuevo: ${formatBytes(stats.bytesNew)}`);
  console.log(`Espacio ahorrado: ${formatBytes(stats.bytesOriginal - stats.bytesNew)}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️ ERRORES (${stats.errors.length}):`);
    stats.errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n✅ Proceso completado');
}

main().catch(console.error);
