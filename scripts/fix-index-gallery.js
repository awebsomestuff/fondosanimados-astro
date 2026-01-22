/**
 * Script para optimizar imágenes de GALERÍA del index
 *
 * Galerías identificadas:
 * 1. elemento-index: Categorías principales (250x141 o 350x197)
 *    - PC muestra: 205x115
 *    - Móvil muestra: 308x173
 *    - Las de 350px son muy grandes, las de 250px están bien
 *
 * 2. personaje-index: Personajes destacados (200x356)
 *    - Solo necesitan compresión
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');
const QUALITY = 65;

// Imágenes de galería elemento-index (categorías)
const ELEMENTO_INDEX_IMAGES = [
  '2022/10/anime_parapc.webp',
  '2022/10/series-peliculas_parapc.webp',
  '2022/10/videojuegos_parapc.webp',
  '2022/10/dragon-ball-franchise-wallpaper_resultado_1_parapc.webp',
  '2022/10/disney_parapc.webp',
  '2023/02/fondos-aesthetic_wallpapers-video.webp',
  '2023/08/NARUTO-pequena.webp',
  '2023/02/fondos-de-paisajes_wallpapers-video.webp',
  '2023/08/FUTBOL-pequena.webp',
  '2023/08/ONE-PIECE-pequena.webp',
  '2023/02/fondos-naturaleza_wallpapers-video.webp',
  '2023/02/fondos-coches_wallpapers-video.webp',
  '2023/08/CHAINSAW-MAN-pequena.webp',
  '2023/08/DEMON-SLAYER-pequena.webp',
  '2023/08/bts-2-pequena.webp',
  '2023/08/genshin-impact-1-pequena.webp',
  '2023/05/superman-10-thumb2.webp',
  '2023/08/rick-2-pequena.webp',
  '2023/08/starwars-1-pequena.webp',
  '2023/08/Zero-Two-pequena.webp'
];

// Imágenes de galería personaje-index
const PERSONAJE_INDEX_IMAGES = [
  '2023/07/goku.webp',
  '2023/07/vegeta.webp',
  '2023/07/zoro.webp',
  '2023/07/gogeta.webp',
  '2023/07/Nezuko.webp',
  '2023/07/power.webp',
  '2023/07/itachi.webp',
  '2023/07/luffy.webp',
  '2023/07/sasuke.webp'
];

// Comprimir imagen usando archivo temporal
async function compressImage(relativePath, targetWidth = null) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const tempPath = path.join(dir, `${base}-temp-compress${ext}`);

  try {
    const originalStats = await fs.stat(inputPath);
    const originalBuffer = await fs.readFile(inputPath);
    const metadata = await sharp(originalBuffer).metadata();

    let pipeline = sharp(originalBuffer);

    // Redimensionar si se especifica y la imagen es más grande
    if (targetWidth && metadata.width > targetWidth) {
      pipeline = pipeline.resize(targetWidth, null, { withoutEnlargement: true });
    }

    // Comprimir
    await pipeline.webp({ quality: QUALITY }).toFile(tempPath);

    const newStats = await fs.stat(tempPath);

    // Solo reemplazar si es más pequeño
    if (newStats.size < originalStats.size) {
      const newBuffer = await fs.readFile(tempPath);
      await fs.writeFile(inputPath, newBuffer);
      await fs.unlink(tempPath);

      // Obtener nuevas dimensiones
      const newMetadata = await sharp(inputPath).metadata();

      return {
        file: relativePath,
        before: originalStats.size,
        after: newStats.size,
        oldDimensions: `${metadata.width}x${metadata.height}`,
        newDimensions: `${newMetadata.width}x${newMetadata.height}`,
        saved: true
      };
    } else {
      await fs.unlink(tempPath);
      return {
        file: relativePath,
        before: originalStats.size,
        after: originalStats.size,
        dimensions: `${metadata.width}x${metadata.height}`,
        saved: false,
        reason: 'Ya optimizado'
      };
    }
  } catch (error) {
    try { await fs.unlink(tempPath); } catch {}
    console.error(`Error procesando ${relativePath}:`, error.message);
    return { file: relativePath, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('OPTIMIZACIÓN DE IMÁGENES DE GALERÍA - INDEX');
  console.log('='.repeat(60));

  let totalBefore = 0;
  let totalAfter = 0;

  // 1. Procesar elemento-index (categorías)
  // Redimensionar las de 350px a 310px (suficiente para móvil 308px)
  console.log('\n--- 1. Galería elemento-index (categorías) ---');
  console.log('Objetivo: redimensionar 350px -> 310px, comprimir con quality 65\n');

  for (const img of ELEMENTO_INDEX_IMAGES) {
    const result = await compressImage(img, 310);
    if (!result.error) {
      totalBefore += result.before;
      totalAfter += result.after;
      if (result.saved) {
        const savings = ((1 - result.after / result.before) * 100).toFixed(0);
        const dimInfo = result.oldDimensions !== result.newDimensions
          ? ` [${result.oldDimensions} → ${result.newDimensions}]`
          : ` [${result.newDimensions}]`;
        console.log(`✓ ${path.basename(img)}: ${(result.before/1024).toFixed(1)}KB → ${(result.after/1024).toFixed(1)}KB (-${savings}%)${dimInfo}`);
      } else {
        console.log(`⏭ ${path.basename(img)}: ${result.reason} [${result.dimensions}]`);
      }
    }
  }

  // 2. Procesar personaje-index (solo compresión, ya son 200px)
  console.log('\n--- 2. Galería personaje-index (personajes) ---');
  console.log('Objetivo: solo comprimir con quality 65 (ya son 200x356px)\n');

  for (const img of PERSONAJE_INDEX_IMAGES) {
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

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN');
  console.log('='.repeat(60));
  console.log(`Imágenes procesadas: ${ELEMENTO_INDEX_IMAGES.length + PERSONAJE_INDEX_IMAGES.length}`);
  console.log(`Antes: ${(totalBefore / 1024).toFixed(1)} KB`);
  console.log(`Después: ${(totalAfter / 1024).toFixed(1)} KB`);
  const savings = totalBefore > 0 ? ((totalBefore - totalAfter) / 1024).toFixed(1) : 0;
  const percent = totalBefore > 0 ? ((1 - totalAfter/totalBefore) * 100).toFixed(1) : 0;
  console.log(`Ahorro: ${savings} KB (${percent}%)`);
}

main().catch(console.error);
