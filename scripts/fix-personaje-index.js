/**
 * Script para redimensionar personaje-index a 110px
 * Usa método de buffer para evitar EBUSY en Windows
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');
const QUALITY = 65;
const TARGET_WIDTH = 110;

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

async function resizeImage(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);

  try {
    const originalStats = await fs.stat(inputPath);
    const originalBuffer = await fs.readFile(inputPath);
    const metadata = await sharp(originalBuffer).metadata();

    // Si ya es 110px o menor, solo reportar
    if (metadata.width <= TARGET_WIDTH) {
      return {
        file: relativePath,
        skipped: true,
        reason: `Ya es ${metadata.width}px`
      };
    }

    // Redimensionar en memoria (no archivo temporal)
    const resizedBuffer = await sharp(originalBuffer)
      .resize(TARGET_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();

    // Escribir directamente al archivo original
    await fs.writeFile(inputPath, resizedBuffer);

    const newStats = await fs.stat(inputPath);
    const newMetadata = await sharp(inputPath).metadata();

    return {
      file: relativePath,
      before: originalStats.size,
      after: newStats.size,
      oldDimensions: `${metadata.width}x${metadata.height}`,
      newDimensions: `${newMetadata.width}x${newMetadata.height}`,
      saved: true
    };
  } catch (error) {
    console.error(`Error procesando ${relativePath}:`, error.message);
    return { file: relativePath, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('REDIMENSIONANDO PERSONAJE-INDEX A 110px');
  console.log('='.repeat(60));

  let totalBefore = 0;
  let totalAfter = 0;

  for (const img of PERSONAJE_INDEX_IMAGES) {
    const result = await resizeImage(img);
    if (result.skipped) {
      console.log(`⏭ ${path.basename(img)}: ${result.reason}`);
    } else if (result.saved) {
      totalBefore += result.before;
      totalAfter += result.after;
      const savings = ((1 - result.after / result.before) * 100).toFixed(0);
      console.log(`✓ ${path.basename(img)}: ${(result.before/1024).toFixed(1)}KB → ${(result.after/1024).toFixed(1)}KB (-${savings}%) [${result.oldDimensions} → ${result.newDimensions}]`);
    } else if (result.error) {
      console.log(`✗ ${path.basename(img)}: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN');
  console.log('='.repeat(60));
  console.log(`Antes: ${(totalBefore / 1024).toFixed(1)} KB`);
  console.log(`Después: ${(totalAfter / 1024).toFixed(1)} KB`);
  const savings = totalBefore > 0 ? ((totalBefore - totalAfter) / 1024).toFixed(1) : 0;
  console.log(`Ahorro: ${savings} KB`);
}

main().catch(console.error);
