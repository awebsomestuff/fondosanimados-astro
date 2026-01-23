/**
 * Script de optimización de imágenes preview para /one-piece/luffy/
 *
 * Patrón: preview estándar
 * - PC: 1000px
 * - Móvil: 651px
 * - Sufijo: -mobile.webp
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');
const ASTRO_FILE = path.join(__dirname, '../src/pages/one-piece/luffy/index.astro');
const QUALITY = 65;

// Imágenes preview identificadas
const PREVIEW_IMAGES = [
  '2025/11/luffy-1.webp',
  '2025/11/luffy-2.webp',
  '2025/11/luffy-3.webp',
  '2025/11/luffy-4.webp',
  '2025/11/luffy-5.webp',
  '2025/11/luffy-6.webp',
  '2025/11/luffy-7.webp',
  '2025/11/luffy-8.webp',
  '2025/11/luffy-9.webp',
  '2025/11/luffy-10.webp',
  '2025/11/luffy-11.webp',
  '2025/11/luffy-12.webp',
  '2025/11/luffy-13.webp',
  '2025/11/luffy-14.webp',
  '2025/11/luffy-15.webp',
  '2025/11/luffy-16.webp',
  '2025/11/luffy-17.webp',
  '2025/11/luffy-18.webp',
  '2025/11/luffy-19.webp',
  '2025/11/luffy-20.webp',
  '2025/11/luffy-21.webp',
  '2025/11/luffy-22.webp',
  '2025/11/luffy-23.webp',
  '2025/11/luffy-24.webp',
  '2025/11/luffy-25.webp',
  '2025/11/luffy-26.webp',
  '2025/11/luffy-27.webp',
  '2025/11/luffy-28.webp',
  '2025/11/luffy-29.webp',
  '2025/11/luffy-30.webp',
  '2025/11/luffy-31.webp',
  '2025/11/luffy-32.webp',
  '2025/11/luffy-33.webp',
  '2025/11/luffy-34.webp',
  '2025/11/luffy-35.webp',
  '2025/11/luffy-36.webp',
  '2025/11/luffy-37.webp',
  '2025/12/luffy-38.webp',
  '2025/12/luffy-39.webp',
  '2025/12/luffy-40.webp',
  '2025/12/luffy-41.webp',
  '2025/12/luffy-42.webp'
];

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

// Comprimir imagen original (sin cambiar tamaño)
async function compressImage(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);

  if (!await fileExists(inputPath)) {
    return { path: relativePath, error: 'No existe' };
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

// Actualizar HTML
async function updateHtml() {
  let html = await fs.readFile(ASTRO_FILE, 'utf-8');
  let changes = 0;

  for (const img of PREVIEW_IMAGES) {
    const dir = path.dirname(img);
    const ext = path.extname(img);
    const base = path.basename(img, ext);

    // Buscar la imagen y añadir srcset
    const pattern = new RegExp(
      `(<img[^>]*src="/uploads/${dir}/${base}\\.webp"[^>]*class="wv-preview-image"[^>]*loading="lazy")([^>]*/>)`,
      'g'
    );

    html = html.replace(pattern, (match, before, after) => {
      // Si ya tiene srcset, no modificar
      if (match.includes('srcset=')) return match;

      changes++;
      const srcset = `/uploads/${dir}/${base}-mobile.webp 651w, /uploads/${dir}/${base}.webp 1000w`;
      const sizes = '(max-width: 850px) 240px, 1000px';
      return `${before} srcset="${srcset}" sizes="${sizes}"${after}`;
    });

    // También buscar variantes sin loading="lazy" al final
    const pattern2 = new RegExp(
      `(<img[^>]*src="/uploads/${dir}/${base}\\.webp"[^>]*class="wv-preview-image")([^>]*loading="lazy"[^>]*/>)`,
      'g'
    );

    html = html.replace(pattern2, (match, before, after) => {
      if (match.includes('srcset=')) return match;

      changes++;
      const srcset = `/uploads/${dir}/${base}-mobile.webp 651w, /uploads/${dir}/${base}.webp 1000w`;
      const sizes = '(max-width: 850px) 240px, 1000px';
      return `${before} srcset="${srcset}" sizes="${sizes}"${after}`;
    });
  }

  await fs.writeFile(ASTRO_FILE, html);
  return changes;
}

async function main() {
  console.log('='.repeat(70));
  console.log('OPTIMIZACIÓN DE IMÁGENES PREVIEW - /one-piece/luffy/');
  console.log('='.repeat(70));

  let totalSaved = 0;
  let totalProcessed = 0;
  let errors = [];

  console.log('\n📹 1. COMPRIMIENDO ORIGINALES Y CREANDO VERSIONES MÓVILES');
  console.log('-'.repeat(50));

  for (const img of PREVIEW_IMAGES) {
    // Comprimir original
    const compressResult = await compressImage(img);
    if (compressResult.error) {
      errors.push(`${img}: ${compressResult.error}`);
      continue;
    }

    if (compressResult.saved > 0) {
      console.log(`  ✓ ${img}`);
      console.log(`    Comprimido: ${formatBytes(compressResult.before)} → ${formatBytes(compressResult.after)} (${formatBytes(compressResult.saved)} ahorrado)`);
      totalSaved += compressResult.saved;
    } else {
      console.log(`  ○ ${img} (ya optimizado)`);
    }

    // Crear versión móvil
    const mobileResult = await createMobileVersion(img);
    if (mobileResult.error) {
      errors.push(`Mobile ${img}: ${mobileResult.error}`);
    } else {
      console.log(`    Móvil: ${mobileResult.mobilePath} (${formatBytes(mobileResult.size)})`);
    }

    totalProcessed++;
  }

  console.log('\n📝 2. ACTUALIZANDO HTML');
  console.log('-'.repeat(50));

  const htmlChanges = await updateHtml();
  console.log(`  ✓ ${htmlChanges} cambios realizados en index.astro`);

  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN');
  console.log('='.repeat(70));
  console.log(`Total imágenes procesadas: ${totalProcessed}`);
  console.log(`Espacio ahorrado: ${formatBytes(totalSaved)}`);
  console.log(`Cambios en HTML: ${htmlChanges}`);

  if (errors.length > 0) {
    console.log(`\n⚠️ ERRORES (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e}`));
  }
}

main().catch(console.error);
