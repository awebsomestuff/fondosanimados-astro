/**
 * Script FINAL para corregir /attack-on-titan/
 *
 * Correcciones:
 * 1. Remover srcset de imágenes de galería (ya son pequeñas, 150px)
 * 2. Comprimir imágenes originales de PC con quality 65 (usando nuevo nombre temporal)
 * 3. Mantener srcset solo para preview (651w móvil, 1000w PC)
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

// Imágenes de galería - pequeñas, solo comprimir
const GALLERY_IMAGES = [
  '2023/09/sasha-braus-mobile-6-tumb2.webp',
  '2023/09/zeke-yaeger-mobile-3-tumb2.webp',
  '2023/09/eren-yaeger-mobile-9-tumb2.webp',
  '2023/09/annie-leonhart-mobile-2-tumb2.webp',
  '2023/09/armin-arlert-mobile-5-tumb2.webp',
  '2023/09/erwin-smith-mobile-5-tumb2.webp',
  '2023/09/hange-zoe-mobile-2-tumb2.webp',
  '2023/09/pieck-finger-mobile-2-tumb2.webp',
  '2023/09/reiner-mobile-2-tumb2.webp',
  '2023/09/levi-ackerman-mobile-3-tumb2.webp',
  '2023/09/mikasa-ackerman-mobile-4-tumb2.webp',
  '2023/09/Goku-y-Planeta-photo-tumb2.webp'
];

// Imágenes de preview - estas sí necesitan srcset
const PREVIEW_IMAGES = [
  '2025/11/attack-on-titan-1.webp',
  '2025/11/attack-on-titan-2.webp',
  '2025/11/attack-on-titan-3.webp',
  '2025/11/attack-on-titan-4.webp',
  '2025/11/attack-on-titan-5.webp',
  '2025/11/attack-on-titan-6.webp',
  '2025/11/attack-on-titan-7.webp',
  '2025/11/attack-on-titan-8.webp',
  '2025/11/attack-on-titan-9.webp',
  '2025/11/attack-on-titan-10.webp',
  '2025/11/attack-on-titan-11.webp',
  '2025/11/attack-on-titan-12.webp',
  '2025/11/attack-on-titan-13.webp',
  '2025/11/attack-on-titan-14.webp',
  '2025/11/attack-on-titan-15.webp',
  '2025/11/attack-on-titan-16.webp',
  '2025/11/attack-on-titan-17.webp',
  '2025/11/attack-on-titan-18.webp',
  '2025/11/attack-on-titan-19.webp',
  '2025/11/attack-on-titan-20.webp',
  '2025/11/attack-on-titan-21.webp',
  '2025/11/attack-on-titan-22.webp',
  '2025/11/attack-on-titan-23.webp',
  '2025/11/attack-on-titan-24.webp',
  '2025/11/attack-on-titan-25.webp',
  '2025/11/attack-on-titan-26.webp',
  '2025/11/attack-on-titan-27.webp',
  '2025/11/attack-on-titan-28.webp',
  '2025/11/attack-on-titan-29.webp',
  '2025/11/attack-on-titan-30.webp',
  '2025/11/attack-on-titan-31.webp',
  '2025/11/attack-on-titan-32.webp',
  '2025/11/attack-on-titan-33.webp',
  '2025/11/attack-on-titan-34.webp'
];

// Comprimir imagen usando nombre temporal diferente
async function compressImage(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const tempPath = path.join(dir, `${base}-compressed${ext}`);

  try {
    const originalStats = await fs.stat(inputPath);
    const originalBuffer = await fs.readFile(inputPath);

    // Comprimir a nuevo archivo
    await sharp(originalBuffer)
      .webp({ quality: QUALITY })
      .toFile(tempPath);

    const newStats = await fs.stat(tempPath);

    // Solo reemplazar si es más pequeño
    if (newStats.size < originalStats.size) {
      // Leer el nuevo archivo y sobrescribir el original
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
    // Limpiar archivo temporal si existe
    try { await fs.unlink(tempPath); } catch {}
    console.error(`Error comprimiendo ${relativePath}:`, error.message);
    return { file: relativePath, error: error.message };
  }
}

// Remover srcset de imágenes de galería en el archivo astro
async function fixAstroPage() {
  const pagePath = path.join(PAGES_DIR, 'attack-on-titan/index.astro');
  let content = await fs.readFile(pagePath, 'utf-8');
  let changes = 0;

  // Remover srcset y sizes de imágenes de galería (las que tienen class alignnone)
  // Patrón: srcset="...-mobile.webp 240w, ....webp 200w" sizes="..."
  const srcsetPattern = / srcset="[^"]*-mobile\.webp 240w[^"]*" sizes="[^"]*"/g;

  content = content.replace(srcsetPattern, (match) => {
    changes++;
    return '';
  });

  if (changes > 0) {
    await fs.writeFile(pagePath, content, 'utf-8');
  }

  return changes;
}

// Eliminar versiones -mobile de galería (no las necesitamos)
async function cleanupGalleryMobile() {
  let deleted = 0;
  for (const img of GALLERY_IMAGES) {
    const ext = path.extname(img);
    const base = img.slice(0, -ext.length);
    const mobilePath = path.join(UPLOADS_DIR, `${base}-mobile${ext}`);

    try {
      await fs.unlink(mobilePath);
      deleted++;
    } catch {
      // No existía
    }
  }
  return deleted;
}

async function main() {
  console.log('='.repeat(60));
  console.log('CORRECCIÓN FINAL de /attack-on-titan/');
  console.log('='.repeat(60));

  let totalBefore = 0;
  let totalAfter = 0;

  // 1. Comprimir imágenes de galería
  console.log('\n--- 1. Comprimiendo galería (originales) ---');
  for (const img of GALLERY_IMAGES) {
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

  // 2. Comprimir imágenes de preview (PC)
  console.log('\n--- 2. Comprimiendo preview PC (originales) ---');
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

  // 3. Remover srcset de galería en el archivo .astro
  console.log('\n--- 3. Corrigiendo srcset en index.astro ---');
  const srcsetChanges = await fixAstroPage();
  console.log(`✓ Removidos ${srcsetChanges} srcset de imágenes de galería`);

  // 4. Limpiar archivos -mobile de galería
  console.log('\n--- 4. Limpiando archivos -mobile de galería ---');
  const deletedMobile = await cleanupGalleryMobile();
  console.log(`✓ Eliminados ${deletedMobile} archivos -mobile innecesarios`);

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN');
  console.log('='.repeat(60));
  console.log(`Antes: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Después: ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
  const savings = totalBefore > 0 ? ((totalBefore - totalAfter) / 1024 / 1024).toFixed(2) : 0;
  const percent = totalBefore > 0 ? ((1 - totalAfter/totalBefore) * 100).toFixed(1) : 0;
  console.log(`Ahorro: ${savings} MB (${percent}%)`);
  console.log('\nNota: Las imágenes de preview mantienen srcset (651w móvil, 1000w PC)');
  console.log('Las imágenes de galería ya son pequeñas (150px), no necesitan srcset');
}

main().catch(console.error);
