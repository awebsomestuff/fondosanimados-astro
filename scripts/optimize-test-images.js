/**
 * Script de optimización de imágenes para páginas de prueba
 * Genera versiones optimizadas para PC y móvil
 *
 * Tamaños objetivo:
 * - Galerías de personajes: PC 200px, Móvil 120px
 * - Preview de reproductor: PC 1080px, Móvil 640px
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');

// Configuración de tamaños
const SIZES = {
  // Para imágenes de galería (personajes, thumbnails)
  gallery: {
    pc: 200,      // ancho en px
    mobile: 120   // ancho en px
  },
  // Para preview de reproductor
  preview: {
    pc: 1080,     // ancho en px
    mobile: 640   // ancho en px
  }
};

// Imágenes de las 6 páginas de prueba
const TEST_IMAGES = {
  // /attack-on-titan/ - personaje6 (galería)
  galleryAttackOnTitan: [
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
  ],

  // /chainsaw-man/ - personaje7 (galería)
  galleryChainsawMan: [
    '2023/07/denji.webp',
    '2023/07/power.webp',
    '2023/07/makima.webp',
    '2023/07/kishibe.webp',
    '2023/07/aki-hayawaka.webp',
    '2023/07/himeno.webp',
    '2023/07/kobeni.webp'
  ],

  // /anime/ - personaje8 (galería + banners)
  galleryAnime: [
    '2023/02/naruto-fondos_.webp',
    '2023/02/Fondos-Dragon-Ball_.webp',
    '2023/02/demon-slayer_.webp',
    '2023/02/Pokemon-fondos_.webp',
    '2023/07/naruto.webp',
    '2023/07/goku.webp',
    '2023/07/itachi.webp',
    '2023/07/luffy.webp',
    '2023/07/power.webp',
    '2023/07/zoro.webp',
    '2023/07/Tanjiro.webp',
    '2023/07/Zenitsu.webp',
    '2023/07/denji.webp',
    '2023/07/vegeta.webp',
    '2023/07/sasuke.webp',
    '2023/07/Vegito.webp',
    '2023/07/gogeta.webp',
    '2023/07/Nezuko.webp',
    '2023/07/Shinobu.webp',
    '2023/07/makima.webp',
    '2023/09/levi-ackerman.webp',
    '2023/09/toga-himiko-mobile-1.webp',
    '2023/09/uraraka-ochako.webp',
    '2023/09/yor-forger.webp',
    '2023/09/yuji-itadori-mobile-5.webp',
    '2023/09/yuta-okkotsu-mobile-1.webp',
    '2023/09/anya-forger.webp',
    '2023/09/kugisaki-nobara.webp'
  ],

  // /principal/ - personaje-index (galería)
  galleryPrincipal: [
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
  ],

  // /dragon-ball/ - personaje (galería)
  galleryDragonBall: [
    '2023/07/goku.webp',
    '2023/07/vegeta.webp',
    '2023/07/Vegito.webp',
    '2023/07/gogeta.webp',
    '2023/07/Android-18.webp',
    '2023/07/broly.webp',
    '2023/07/bulma.webp',
    '2023/07/buu.webp',
    '2023/07/cell.webp',
    '2023/07/freezer.webp',
    '2023/07/gohan.webp',
    '2023/07/goten-2.webp',
    '2023/07/krillin.webp',
    '2023/07/piccolo.webp',
    '2023/07/tien.webp',
    '2023/07/trunks-11.webp',
    '2023/07/yamcha.webp',
    '2023/07/naruto.webp'
  ],

  // Preview de reproductores (todas las páginas)
  previewAttackOnTitan: [
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
  ],

  previewChainsawMan: [
    '2025/11/denji-1.webp',
    '2025/11/power-3.webp',
    '2025/11/chainsaw-man-5.webp',
    '2025/11/denji-8.webp',
    '2025/11/power-6.webp',
    '2025/11/makima-6.webp',
    '2025/11/denji-10.webp',
    '2025/11/makima-7.webp',
    '2025/11/kobeni-5.webp',
    '2025/11/denji-5.webp',
    '2025/11/aki-8.webp',
    '2025/11/aki-9.webp',
    '2025/11/denji-4.webp',
    '2025/11/makima-2.webp',
    '2025/11/aki-12.webp',
    '2025/11/aki-13.webp',
    '2025/11/kobeni-9.webp',
    '2025/11/makima-13.webp',
    '2025/11/chainsaw-man-6.webp',
    '2025/11/makima-20.webp',
    '2025/11/makima-21.webp',
    '2025/11/chainsaw-man-7.webp',
    '2025/11/kishibe-4.webp'
  ],

  previewAnime: [
    '2025/11/yuta-okkotsu-1.webp',
    '2025/11/toga-himiko-1.webp',
    '2025/11/kugisaki-nobara-5.webp',
    '2025/11/ikuzu-midoriya-16.webp',
    '2025/11/mikasa-ackerman-12.webp',
    '2025/11/levi-ackerman-4.webp',
    '2025/11/levi-ackerman-5.webp',
    '2025/11/pieck-finger-2.webp',
    '2025/11/armin-arlert-1.webp',
    '2025/11/annie-leonhart-1.webp',
    '2025/11/yor-forger-2.webp',
    '2025/11/yor-forger-7.webp',
    '2025/11/anya-forger-8.webp',
    '2025/11/baki-1.webp',
    '2025/11/Hashiras_wallpaper-1920x1080-1.webp',
    '2025/11/The-Hashira-Pilars_wallpaper-1920x1080-1.webp',
    '2025/11/zoro-1.webp',
    '2025/11/goku-13.webp',
    '2025/11/one-punch-man-1.webp',
    '2025/11/Neon-Genesis-Evangelion-Girls-4K_wallpaper-1920x1080-1.webp',
    '2025/11/baki-13.webp',
    '2025/11/my-hero-academia-6.webp',
    '2025/11/my-hero-academia-10.webp',
    '2025/11/makima-8.webp',
    '2025/11/gohan-1.webp'
  ],

  previewPrincipal: [
    '2025/11/index-4.webp',
    '2025/11/index-5.webp',
    '2025/11/yor-forger-1.webp',
    '2025/11/mclaren-3.webp',
    '2025/11/index-9.webp',
    '2025/11/index-27.webp',
    '2025/11/index-33.webp',
    '2025/11/index-34.webp',
    '2025/11/index-57.webp',
    '2025/11/vegeta-6.webp',
    '2025/11/index-66.webp',
    '2025/11/index-72.webp',
    '2025/11/index-26.webp',
    '2025/11/gogeta-2.webp',
    '2025/11/pasiajes-6.webp',
    '2025/11/chevrolet-4.webp',
    '2025/11/supra-4.webp',
    '2025/11/espacio-1.webp'
  ],

  previewDragonBall: [
    '2025/11/vegeta-11.webp',
    '2025/11/Goku-Aesthetic_wallpaper-1920x1080-1.webp',
    '2025/11/goku-house-wallpaper-estatico-1920x1080-1.webp',
    '2025/11/kame-house-dragon-ball-wallpaper-estatico-1920x1080-1.webp',
    '2025/11/gogeta-2.webp',
    '2025/11/The-Family_wallpaper-1920x1080-1.webp',
    '2025/11/goku-vegeta-1.webp',
    '2025/11/goku-vegeta-2.webp',
    '2025/11/dragon-ball-z-tournament-estatico-1920x1080-1.webp',
    '2025/11/dragon-ball-franchise-wallpaper_resultado-1920x1080-1.webp',
    '2025/11/vegeta-6.webp',
    '2025/11/vegeta-7.webp',
    '2025/11/goku-13.webp',
    '2025/11/ssjb-kaioken-goku-wallpaper-estatico-1920x1080-1.webp',
    '2025/11/super-saiyan-goku-db-legends-wallpaper-estatico-1920x1080-1.webp',
    '2025/11/Goku-Holding-Ethereum_wallpaper-1920x1080-1.webp',
    '2025/11/Gogeta-SSJ4_wallpaper-1920x1080-1.webp',
    '2025/11/goku-7.webp',
    '2025/11/goku-10.webp',
    '2025/11/goku-16.webp',
    '2025/11/goku-17.webp',
    '2025/11/broly-6.webp',
    '2025/11/broly-9.webp',
    '2025/11/broly-13.webp',
    '2025/11/android-18-fight-wallpaper-estatico-1920x1080-1.webp',
    '2025/11/buu-2.webp',
    '2025/11/vegeta-10.webp',
    '2025/11/freezer-1.webp',
    '2025/11/gohan-ssj2-wallpaper-estatico-1920x1080-1.webp',
    '2025/11/A-lomos-de-Shenlong_wallpaper-1920x1080-1.webp',
    '2025/11/Battle_wallpaper-1920x1080-1.webp',
    '2025/11/Black-Frieza_wallpaper-1920x1080-1.webp',
    '2025/11/Celula_wallpaper-1920x1080-1.webp',
    '2025/11/Chica-no-se_wallpaper-1920x1080-1.webp',
    '2025/11/Full-Power-Jiren_wallpaper-1920x1080-1.webp',
    '2025/11/Kame-House-4K_wallpaper-1920x1080-1.webp',
    '2025/11/Shenlong-and-the-Dragon-Balls_wallpaper-1920x1080-1.webp',
    '2025/11/Shenlong-with-Lights_wallpaper-1920x1080-1.webp',
    '2025/11/Windows-Genkidama_wallpaper-1920x1080-1.webp',
    '2025/11/Assault-on-Red-Ribbon-Armybase_wallpaper-1920x1080-1.webp'
  ],

  previewAbstracto: [
    '2025/11/Puntos-4K_wallpaper-1920x1080-1.webp',
    '2025/11/Endless-Space_wallpaper-1920x1080-1.webp',
    '2025/11/sparkle-wave-wallpaper-estatico.webp',
    '2025/11/abstracto-4.webp',
    '2025/11/abstracto-5.webp',
    '2025/11/abstracto-7.webp',
    '2025/11/abstracto-8.webp',
    '2025/11/abstracto-9.webp',
    '2025/11/abstracto-10.webp',
    '2025/11/abstracto-11.webp',
    '2025/11/abstracto-12.webp',
    '2025/11/abstracto-13.webp',
    '2025/11/abstracto-14.webp',
    '2025/11/abstracto-15.webp',
    '2025/11/abstracto-16.webp',
    '2025/11/abstracto-17.webp',
    '2025/11/abstracto-18.webp',
    '2025/11/abstracto-19.webp',
    '2025/11/abstracto-20.webp',
    '2025/11/abstracto-21.webp',
    '2025/11/abstracto-22.webp',
    '2025/11/abstracto-23.webp',
    '2025/11/abstracto-24.webp',
    '2025/11/abstracto-25.webp',
    '2025/11/abstracto-26.webp',
    '2025/11/abstracto-27.webp',
    '2025/11/abstracto-28.webp',
    '2025/11/abstracto-29.webp',
    '2025/11/abstracto-30.webp',
    '2025/11/abstracto-31.webp',
    '2025/11/abstracto-32.webp',
    '2025/11/abstracto-33.webp',
    '2025/11/abstracto-34.webp',
    '2025/11/abstracto-35.webp',
    '2025/11/abstracto-36.webp',
    '2025/11/abstracto-37.webp'
  ]
};

// Función para obtener el nombre del archivo móvil
function getMobileFilename(filename) {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  return `${base}-mobile${ext}`;
}

// Función para optimizar una imagen (solo crea versión móvil)
async function optimizeImage(relativePath, type) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);
  const dir = path.dirname(inputPath);
  const filename = path.basename(relativePath);
  const mobileFilename = getMobileFilename(filename);
  const mobileOutputPath = path.join(dir, mobileFilename);

  const sizes = type === 'gallery' ? SIZES.gallery : SIZES.preview;

  try {
    // Verificar que el archivo existe
    await fs.access(inputPath);

    // Verificar si ya existe versión móvil
    try {
      await fs.access(mobileOutputPath);
      // Ya existe, saltar
      const originalStats = await fs.stat(inputPath);
      const mobileStats = await fs.stat(mobileOutputPath);
      return {
        original: relativePath,
        originalSize: originalStats.size,
        mobileSize: mobileStats.size,
        skipped: true
      };
    } catch {
      // No existe, crear
    }

    const results = {
      original: relativePath,
      originalSize: null,
      mobileSize: null,
      skipped: false
    };

    // Obtener tamaño del archivo original
    const originalStats = await fs.stat(inputPath);
    results.originalSize = originalStats.size;

    // Crear versión móvil
    await sharp(inputPath)
      .resize(sizes.mobile, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(mobileOutputPath);

    const mobileStats = await fs.stat(mobileOutputPath);
    results.mobileSize = mobileStats.size;

    return results;

  } catch (error) {
    console.error(`Error procesando ${relativePath}:`, error.message);
    return { original: relativePath, error: error.message };
  }
}

// Función principal
async function main() {
  console.log('='.repeat(60));
  console.log('Optimización de imágenes para páginas de prueba');
  console.log('='.repeat(60));

  // Recopilar todas las imágenes únicas
  const galleryImages = new Set();
  const previewImages = new Set();

  // Agregar imágenes de galería
  Object.keys(TEST_IMAGES).forEach(key => {
    if (key.startsWith('gallery')) {
      TEST_IMAGES[key].forEach(img => galleryImages.add(img));
    } else if (key.startsWith('preview')) {
      TEST_IMAGES[key].forEach(img => previewImages.add(img));
    }
  });

  console.log(`\nImágenes de galería: ${galleryImages.size}`);
  console.log(`Imágenes de preview: ${previewImages.size}`);
  console.log(`Total: ${galleryImages.size + previewImages.size}`);

  let totalOriginal = 0;
  let totalMobile = 0;
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  // Procesar imágenes de galería
  console.log('\n--- Procesando imágenes de galería ---');
  for (const img of galleryImages) {
    const result = await optimizeImage(img, 'gallery');
    if (result.error) {
      errors++;
    } else if (result.skipped) {
      skipped++;
      totalOriginal += result.originalSize || 0;
      totalMobile += result.mobileSize || 0;
      console.log(`⏭ ${img} (ya existe versión móvil)`);
    } else {
      processed++;
      totalOriginal += result.originalSize || 0;
      totalMobile += result.mobileSize || 0;
      console.log(`✓ ${img}`);
      console.log(`  Original: ${(result.originalSize / 1024).toFixed(1)}KB → Mobile: ${(result.mobileSize / 1024).toFixed(1)}KB`);
    }
  }

  // Procesar imágenes de preview
  console.log('\n--- Procesando imágenes de preview ---');
  for (const img of previewImages) {
    const result = await optimizeImage(img, 'preview');
    if (result.error) {
      errors++;
    } else if (result.skipped) {
      skipped++;
      totalOriginal += result.originalSize || 0;
      totalMobile += result.mobileSize || 0;
      console.log(`⏭ ${img} (ya existe versión móvil)`);
    } else {
      processed++;
      totalOriginal += result.originalSize || 0;
      totalMobile += result.mobileSize || 0;
      console.log(`✓ ${img}`);
      console.log(`  Original: ${(result.originalSize / 1024).toFixed(1)}KB → Mobile: ${(result.mobileSize / 1024).toFixed(1)}KB`);
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN');
  console.log('='.repeat(60));
  console.log(`Imágenes procesadas: ${processed}`);
  console.log(`Ya existían: ${skipped}`);
  console.log(`Errores: ${errors}`);
  console.log(`Tamaño original total: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Tamaño móvil total: ${(totalMobile / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Ahorro estimado en móvil: ${((totalOriginal - totalMobile) / 1024 / 1024).toFixed(2)} MB (${((1 - totalMobile/totalOriginal) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
