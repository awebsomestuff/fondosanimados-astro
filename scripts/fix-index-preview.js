/**
 * Script para optimizar imágenes PREVIEW del index (reproductor de video)
 *
 * Acciones:
 * 1. Comprimir imágenes originales (PC) con quality 65
 * 2. Generar versiones móviles (651px ancho) con quality 65
 * 3. Actualizar srcset en index.astro
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
const MOBILE_WIDTH = 651;

// Imágenes de preview del index (reproductor de video)
const PREVIEW_IMAGES = [
  '2025/11/index-4.webp',
  '2025/11/index-5.webp',
  '2025/11/yor-forger-1.webp',
  '2025/11/baki-1.webp',
  '2025/11/my-hero-academia-10.webp',
  '2025/11/mclaren-3.webp',
  '2025/11/denji-8.webp',
  '2025/11/index-9.webp',
  '2025/11/index-27.webp',
  '2025/11/index-33.webp',
  '2025/11/index-34.webp',
  '2025/11/anya-forger-8.webp',
  '2025/11/index-57.webp',
  '2025/11/vegeta-6.webp',
  '2025/11/index-66.webp',
  '2025/11/index-72.webp',
  '2025/11/index-26.webp',
  '2025/11/gogeta-2.webp',
  '2025/11/pasiajes-6.webp',
  '2025/11/chevrolet-4.webp',
  '2025/11/supra-4.webp',
  '2025/11/espacio-1.webp',
  '2025/11/denji-4.webp',
  '2025/11/attack-on-titan-21.webp',
  '2025/11/makima-6.webp'
];

// Comprimir imagen original (PC) usando archivo temporal
async function compressImage(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const tempPath = path.join(dir, `${base}-temp-compress${ext}`);

  try {
    const originalStats = await fs.stat(inputPath);
    const originalBuffer = await fs.readFile(inputPath);

    // Comprimir a archivo temporal
    await sharp(originalBuffer)
      .webp({ quality: QUALITY })
      .toFile(tempPath);

    const newStats = await fs.stat(tempPath);

    // Solo reemplazar si es más pequeño
    if (newStats.size < originalStats.size) {
      const newBuffer = await fs.readFile(tempPath);
      await fs.writeFile(inputPath, newBuffer);
      await fs.unlink(tempPath);

      return {
        file: relativePath,
        before: originalStats.size,
        after: newStats.size,
        saved: true
      };
    } else {
      await fs.unlink(tempPath);
      return {
        file: relativePath,
        before: originalStats.size,
        after: originalStats.size,
        saved: false,
        reason: 'Ya optimizado'
      };
    }
  } catch (error) {
    try { await fs.unlink(tempPath); } catch {}
    console.error(`Error comprimiendo ${relativePath}:`, error.message);
    return { file: relativePath, error: error.message };
  }
}

// Crear versión móvil (651px ancho)
async function createMobileVersion(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const mobilePath = path.join(dir, `${base}-mobile${ext}`);

  try {
    const originalBuffer = await fs.readFile(inputPath);
    const metadata = await sharp(originalBuffer).metadata();

    // Solo crear si la imagen original es mayor que MOBILE_WIDTH
    if (metadata.width > MOBILE_WIDTH) {
      await sharp(originalBuffer)
        .resize(MOBILE_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(mobilePath);

      const mobileStats = await fs.stat(mobilePath);
      return {
        file: `${base}-mobile${ext}`,
        size: mobileStats.size,
        created: true
      };
    } else {
      return {
        file: relativePath,
        created: false,
        reason: `Original ya es ${metadata.width}px`
      };
    }
  } catch (error) {
    console.error(`Error creando móvil ${relativePath}:`, error.message);
    return { file: relativePath, error: error.message };
  }
}

// Actualizar srcset en index.astro
async function updateIndexSrcset() {
  const pagePath = path.join(PAGES_DIR, 'index.astro');
  let content = await fs.readFile(pagePath, 'utf-8');
  let changes = 0;

  // Para cada imagen de preview, añadir srcset
  for (const img of PREVIEW_IMAGES) {
    const ext = path.extname(img);
    const base = img.slice(0, -ext.length);
    const mobileImg = `${base}-mobile${ext}`;

    // Patrón: buscar la imagen sin srcset y añadirlo
    // src="/uploads/2025/11/index-4.webp" ... class="wv-preview-image" loading="lazy"/>
    const srcPattern = new RegExp(
      `src="/uploads/${img.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"([^>]*?)class="wv-preview-image"([^>]*?)loading="lazy"([^/]*)/>`,
      'g'
    );

    content = content.replace(srcPattern, (match, before, middle, after) => {
      // Si ya tiene srcset, no modificar
      if (match.includes('srcset=')) {
        return match;
      }
      changes++;
      return `src="/uploads/${img}"${before}class="wv-preview-image"${middle}loading="lazy" srcset="/uploads/${mobileImg} 651w, /uploads/${img} 1000w" sizes="(max-width: 850px) 240px, 1000px"${after}/>`;
    });
  }

  if (changes > 0) {
    await fs.writeFile(pagePath, content, 'utf-8');
  }

  return changes;
}

async function main() {
  console.log('='.repeat(60));
  console.log('OPTIMIZACIÓN DE IMÁGENES PREVIEW - INDEX');
  console.log('='.repeat(60));

  let totalBefore = 0;
  let totalAfter = 0;
  let mobileCreated = 0;

  // 1. Comprimir originales (PC)
  console.log('\n--- 1. Comprimiendo imágenes originales (PC) ---');
  for (const img of PREVIEW_IMAGES) {
    const result = await compressImage(img);
    if (!result.error) {
      totalBefore += result.before;
      totalAfter += result.after;
      if (result.saved) {
        const savings = ((1 - result.after / result.before) * 100).toFixed(0);
        console.log(`✓ ${path.basename(img)}: ${(result.before/1024).toFixed(1)}KB → ${(result.after/1024).toFixed(1)}KB (-${savings}%)`);
      } else {
        console.log(`⏭ ${path.basename(img)}: ${result.reason}`);
      }
    }
  }

  // 2. Crear versiones móviles
  console.log('\n--- 2. Creando versiones móviles (651px) ---');
  for (const img of PREVIEW_IMAGES) {
    const result = await createMobileVersion(img);
    if (result.created) {
      mobileCreated++;
      console.log(`✓ ${result.file}: ${(result.size/1024).toFixed(1)}KB`);
    } else if (result.error) {
      console.log(`✗ ${img}: ${result.error}`);
    } else {
      console.log(`⏭ ${img}: ${result.reason}`);
    }
  }

  // 3. Actualizar srcset en index.astro
  console.log('\n--- 3. Actualizando srcset en index.astro ---');
  const srcsetChanges = await updateIndexSrcset();
  console.log(`✓ Añadido srcset a ${srcsetChanges} imágenes`);

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN');
  console.log('='.repeat(60));
  console.log(`Imágenes procesadas: ${PREVIEW_IMAGES.length}`);
  console.log(`Versiones móviles creadas: ${mobileCreated}`);
  console.log(`Antes: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Después: ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
  const savings = totalBefore > 0 ? ((totalBefore - totalAfter) / 1024 / 1024).toFixed(2) : 0;
  const percent = totalBefore > 0 ? ((1 - totalAfter/totalBefore) * 100).toFixed(1) : 0;
  console.log(`Ahorro en originales: ${savings} MB (${percent}%)`);
  console.log('\nConfiguración srcset aplicada:');
  console.log('  srcset="{imagen}-mobile.webp 651w, {imagen}.webp 1000w"');
  console.log('  sizes="(max-width: 850px) 240px, 1000px"');
}

main().catch(console.error);
