/**
 * Script para corregir imágenes de /attack-on-titan/ v2
 *
 * Correcciones:
 * 1. Comprimir imágenes originales de PC con quality 65
 * 2. Regenerar versiones móviles con tamaños correctos
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');
const QUALITY = 65;

// Imágenes de galería - estas ya son pequeñas, solo comprimir
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

// Imágenes de preview
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

async function compressOriginal(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);
  const tempPath = inputPath + '.tmp';

  try {
    const originalStats = await fs.stat(inputPath);

    // Comprimir sin redimensionar
    await sharp(inputPath)
      .webp({ quality: QUALITY })
      .toFile(tempPath);

    const newStats = await fs.stat(tempPath);

    // Solo reemplazar si es más pequeño
    if (newStats.size < originalStats.size) {
      await fs.unlink(inputPath);
      await fs.rename(tempPath, inputPath);
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
        saved: false
      };
    }
  } catch (error) {
    console.error(`Error comprimiendo ${relativePath}:`, error.message);
    return { file: relativePath, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Comprimiendo imágenes ORIGINALES de /attack-on-titan/');
  console.log(`Quality: ${QUALITY}`);
  console.log('='.repeat(60));

  let totalBefore = 0;
  let totalAfter = 0;

  // Comprimir galería
  console.log('\n--- Galería (originales) ---');
  for (const img of GALLERY_IMAGES) {
    const result = await compressOriginal(img);
    if (!result.error) {
      totalBefore += result.before;
      totalAfter += result.after;
      const savings = ((1 - result.after / result.before) * 100).toFixed(0);
      if (result.saved) {
        console.log(`✓ ${path.basename(img)}: ${(result.before/1024).toFixed(1)}KB → ${(result.after/1024).toFixed(1)}KB (-${savings}%)`);
      } else {
        console.log(`⏭ ${path.basename(img)}: ya optimizado`);
      }
    }
  }

  // Comprimir preview
  console.log('\n--- Preview (originales) ---');
  for (const img of PREVIEW_IMAGES) {
    const result = await compressOriginal(img);
    if (!result.error) {
      totalBefore += result.before;
      totalAfter += result.after;
      const savings = ((1 - result.after / result.before) * 100).toFixed(0);
      if (result.saved) {
        console.log(`✓ ${path.basename(img)}: ${(result.before/1024).toFixed(1)}KB → ${(result.after/1024).toFixed(1)}KB (-${savings}%)`);
      } else {
        console.log(`⏭ ${path.basename(img)}: ya optimizado`);
      }
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN');
  console.log('='.repeat(60));
  console.log(`Antes: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Después: ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Ahorro: ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(2)} MB (${((1 - totalAfter/totalBefore) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
