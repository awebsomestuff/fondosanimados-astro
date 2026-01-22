/**
 * Script para optimizar imágenes de GALERÍA del index - V2
 *
 * Según PageSpeed:
 * - elemento-index: PC=205x115, Móvil=308x173 → necesita srcset inverso
 * - personaje-index: PC=110x196, Móvil=~110px → redimensionar a 110px
 *
 * Estrategia:
 * 1. elemento-index: crear versión -desktop (205px) + mantener actual (310px para móvil)
 * 2. personaje-index: redimensionar a 110px de ancho (ya son pequeñas, no necesitan srcset)
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

// Imágenes de galería elemento-index (categorías)
// Necesitan versión desktop (205px) y móvil (310px actual)
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
// Solo necesitan redimensionar a 110px (PC y móvil muestran igual)
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

// Crear versión desktop de elemento-index (205px)
async function createDesktopVersion(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const desktopPath = path.join(dir, `${base}-desktop${ext}`);

  try {
    const originalBuffer = await fs.readFile(inputPath);
    const metadata = await sharp(originalBuffer).metadata();

    // Crear versión desktop (205px ancho)
    await sharp(originalBuffer)
      .resize(205, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(desktopPath);

    const desktopStats = await fs.stat(desktopPath);
    return {
      file: `${base}-desktop${ext}`,
      size: desktopStats.size,
      dimensions: '205px',
      created: true
    };
  } catch (error) {
    console.error(`Error creando desktop ${relativePath}:`, error.message);
    return { file: relativePath, error: error.message };
  }
}

// Redimensionar personaje-index a 110px
async function resizePersonaje(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const tempPath = path.join(dir, `${base}-temp${ext}`);

  try {
    const originalStats = await fs.stat(inputPath);
    const originalBuffer = await fs.readFile(inputPath);
    const metadata = await sharp(originalBuffer).metadata();

    // Redimensionar a 110px de ancho
    await sharp(originalBuffer)
      .resize(110, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(tempPath);

    const newStats = await fs.stat(tempPath);
    const newMetadata = await sharp(tempPath).metadata();

    // Reemplazar original
    const newBuffer = await fs.readFile(tempPath);
    await fs.writeFile(inputPath, newBuffer);
    await fs.unlink(tempPath);

    return {
      file: relativePath,
      before: originalStats.size,
      after: newStats.size,
      oldDimensions: `${metadata.width}x${metadata.height}`,
      newDimensions: `${newMetadata.width}x${newMetadata.height}`,
      saved: true
    };
  } catch (error) {
    try { await fs.unlink(tempPath); } catch {}
    console.error(`Error redimensionando ${relativePath}:`, error.message);
    return { file: relativePath, error: error.message };
  }
}

// Actualizar HTML del index con srcset para elemento-index
async function updateIndexHtml() {
  const pagePath = path.join(PAGES_DIR, 'index.astro');
  let content = await fs.readFile(pagePath, 'utf-8');
  let changes = 0;

  // Para cada imagen de elemento-index, añadir srcset
  for (const img of ELEMENTO_INDEX_IMAGES) {
    const ext = path.extname(img);
    const base = img.slice(0, -ext.length);
    const desktopImg = `${base}-desktop${ext}`;

    // Buscar la imagen y añadir srcset inverso (desktop pequeño, móvil grande)
    // El patrón busca imágenes en elemento-index sin srcset
    const imgPath = `/uploads/${img}`;
    const desktopPath = `/uploads/${desktopImg}`;

    // Patrón para encontrar la imagen
    const escapedPath = imgPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `(<img[^>]*src="${escapedPath}"[^>]*)(/>|>)`,
      'g'
    );

    content = content.replace(pattern, (match, before, end) => {
      // Si ya tiene srcset, no modificar
      if (match.includes('srcset=')) {
        return match;
      }
      changes++;
      // srcset inverso: desktop pequeño para PC, original para móvil
      // sizes: en móvil (>900px breakpoint según CSS) usa 310px, en PC usa 205px
      return `${before} srcset="${desktopPath} 205w, ${imgPath} 310w" sizes="(max-width: 900px) 310px, 205px"${end}`;
    });
  }

  if (changes > 0) {
    await fs.writeFile(pagePath, content, 'utf-8');
  }

  return changes;
}

async function main() {
  console.log('='.repeat(60));
  console.log('OPTIMIZACIÓN DE GALERÍAS INDEX - V2');
  console.log('='.repeat(60));

  let desktopCreated = 0;

  // 1. Crear versiones desktop para elemento-index
  console.log('\n--- 1. Creando versiones desktop para elemento-index (205px) ---');
  for (const img of ELEMENTO_INDEX_IMAGES) {
    const result = await createDesktopVersion(img);
    if (result.created) {
      desktopCreated++;
      console.log(`✓ ${result.file}: ${(result.size/1024).toFixed(1)}KB`);
    } else if (result.error) {
      console.log(`✗ ${img}: ${result.error}`);
    }
  }

  // 2. Redimensionar personaje-index a 110px
  console.log('\n--- 2. Redimensionando personaje-index a 110px ---');
  let personajeBefore = 0;
  let personajeAfter = 0;

  for (const img of PERSONAJE_INDEX_IMAGES) {
    const result = await resizePersonaje(img);
    if (!result.error && result.saved) {
      personajeBefore += result.before;
      personajeAfter += result.after;
      const savings = ((1 - result.after / result.before) * 100).toFixed(0);
      console.log(`✓ ${path.basename(img)}: ${(result.before/1024).toFixed(1)}KB → ${(result.after/1024).toFixed(1)}KB (-${savings}%) [${result.oldDimensions} → ${result.newDimensions}]`);
    } else if (result.error) {
      console.log(`✗ ${img}: ${result.error}`);
    }
  }

  // 3. Actualizar HTML con srcset para elemento-index
  console.log('\n--- 3. Añadiendo srcset a elemento-index en index.astro ---');
  const srcsetChanges = await updateIndexHtml();
  console.log(`✓ Añadido srcset a ${srcsetChanges} imágenes`);

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN');
  console.log('='.repeat(60));
  console.log(`Versiones desktop creadas: ${desktopCreated}`);
  console.log(`Personajes redimensionados: ${PERSONAJE_INDEX_IMAGES.length}`);
  console.log(`Ahorro en personajes: ${((personajeBefore - personajeAfter) / 1024).toFixed(1)} KB`);
  console.log('\nConfiguración srcset para elemento-index:');
  console.log('  srcset="{img}-desktop.webp 205w, {img}.webp 310w"');
  console.log('  sizes="(max-width: 900px) 310px, 205px"');
  console.log('\nNota: personaje-index no necesita srcset (110px en PC y móvil)');
}

main().catch(console.error);
