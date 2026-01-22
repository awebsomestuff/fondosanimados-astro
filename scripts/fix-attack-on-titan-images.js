/**
 * Script para corregir imágenes de /attack-on-titan/
 *
 * Correcciones:
 * - Preview móvil: 651px de ancho (lo que pide PageSpeed)
 * - Galería móvil: tamaño correcto para DPR 2
 * - Compresión: quality 65 para mejor reducción
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');

// Configuración corregida
const SIZES = {
  gallery: {
    mobile: 240  // Para cubrir ~120px CSS @ 2x DPR
  },
  preview: {
    mobile: 651  // Lo que pide PageSpeed exactamente
  }
};

const QUALITY = 65; // Más agresivo para mejor compresión

// Imágenes de /attack-on-titan/
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

function getMobileFilename(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  return `${base}-mobile${ext}`;
}

async function optimizeImage(relativePath, type) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);
  const dir = path.dirname(inputPath);
  const filename = path.basename(relativePath);
  const mobileFilename = getMobileFilename(filename);
  const mobileOutputPath = path.join(dir, mobileFilename);

  const targetWidth = type === 'gallery' ? SIZES.gallery.mobile : SIZES.preview.mobile;

  try {
    await fs.access(inputPath);

    // Eliminar versión móvil existente si existe
    try {
      await fs.unlink(mobileOutputPath);
    } catch {
      // No existía
    }

    const originalStats = await fs.stat(inputPath);

    // Crear versión móvil con nueva configuración
    await sharp(inputPath)
      .resize(targetWidth, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(mobileOutputPath);

    const mobileStats = await fs.stat(mobileOutputPath);

    return {
      original: relativePath,
      originalSize: originalStats.size,
      mobileSize: mobileStats.size,
      targetWidth
    };

  } catch (error) {
    console.error(`Error procesando ${relativePath}:`, error.message);
    return { original: relativePath, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Corrigiendo imágenes de /attack-on-titan/');
  console.log(`Quality: ${QUALITY}`);
  console.log(`Preview móvil: ${SIZES.preview.mobile}px`);
  console.log(`Galería móvil: ${SIZES.gallery.mobile}px`);
  console.log('='.repeat(60));

  let totalOriginal = 0;
  let totalMobile = 0;
  let processed = 0;
  let errors = 0;

  // Procesar galería
  console.log('\n--- Galería (personajes) ---');
  for (const img of GALLERY_IMAGES) {
    const result = await optimizeImage(img, 'gallery');
    if (result.error) {
      errors++;
    } else {
      processed++;
      totalOriginal += result.originalSize;
      totalMobile += result.mobileSize;
      const savings = ((1 - result.mobileSize / result.originalSize) * 100).toFixed(0);
      console.log(`✓ ${path.basename(img)} → ${result.targetWidth}px @ q${QUALITY}`);
      console.log(`  ${(result.originalSize / 1024).toFixed(1)}KB → ${(result.mobileSize / 1024).toFixed(1)}KB (-${savings}%)`);
    }
  }

  // Procesar preview
  console.log('\n--- Preview (reproductor) ---');
  for (const img of PREVIEW_IMAGES) {
    const result = await optimizeImage(img, 'preview');
    if (result.error) {
      errors++;
    } else {
      processed++;
      totalOriginal += result.originalSize;
      totalMobile += result.mobileSize;
      const savings = ((1 - result.mobileSize / result.originalSize) * 100).toFixed(0);
      console.log(`✓ ${path.basename(img)} → ${result.targetWidth}px @ q${QUALITY}`);
      console.log(`  ${(result.originalSize / 1024).toFixed(1)}KB → ${(result.mobileSize / 1024).toFixed(1)}KB (-${savings}%)`);
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN');
  console.log('='.repeat(60));
  console.log(`Procesadas: ${processed}`);
  console.log(`Errores: ${errors}`);
  console.log(`Original total: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Móvil total: ${(totalMobile / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Ahorro: ${((totalOriginal - totalMobile) / 1024 / 1024).toFixed(2)} MB (${((1 - totalMobile/totalOriginal) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
