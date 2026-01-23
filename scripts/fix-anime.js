/**
 * Script de optimización de imágenes para /anime/
 *
 * Tipos de imágenes a optimizar:
 * 1. Preview del reproductor: 1000px PC, 651px móvil (patrón estándar)
 * 2. elemento-categorias-b: srcset inverso (205px desktop, 310px móvil) - igual que elemento-index
 * 3. personaje8: srcset inverso (125px desktop, 200px móvil)
 * 4. elemento-categorias: convertir JPG a WebP + redimensionar (356px PC, 310px móvil)
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');
const ASTRO_FILE = path.join(__dirname, '../src/pages/anime/index.astro');
const QUALITY = 65;

// ============================================
// IMÁGENES IDENTIFICADAS EN /anime/
// ============================================

// 1. PREVIEW DEL REPRODUCTOR (28 imágenes)
// Tamaño: 1000px PC, 651px móvil
const PREVIEW_IMAGES = [
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
  '2025/11/makima-6.webp',
  '2025/11/goku-13.webp',
  '2025/11/one-punch-man-1.webp',
  '2025/11/Neon-Genesis-Evangelion-Girls-4K_wallpaper-1920x1080-1.webp',
  '2025/11/baki-13.webp',
  '2025/11/makima-7.webp',
  '2025/11/attack-on-titan-21.webp',
  '2025/11/attack-on-titan-28.webp',
  '2025/11/denji-4.webp',
  '2025/11/denji-8.webp',
  '2025/11/my-hero-academia-6.webp',
  '2025/11/my-hero-academia-10.webp',
  '2025/11/denji-1.webp',
  '2025/11/makima-8.webp',
  '2025/11/gohan-1.webp'
];

// 2. PERSONAJE8 (24 imágenes) - srcset inverso: 125px desktop, 200px móvil
const PERSONAJE8_IMAGES = [
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
];

// 3. ELEMENTO-CATEGORIAS (21 imágenes) - JPG a WebP, 356px PC, 310px móvil
const ELEMENTO_CATEGORIAS_IMAGES = [
  '2023/02/naruto-fondos_.webp',
  '2023/02/Fondos-Dragon-Ball_.webp',
  '2023/02/demon-slayer_.webp',
  '2023/02/Pokemon-fondos_.webp',
  '2022/02/vlcsnap-2022-02-26-12h38m27s631-450x253.jpg',
  '2022/02/vlcsnap-2022-01-31-10h29m31s117-450x253-2-450x253.jpg',
  '2022/02/vlcsnap-2022-02-18-13h10m38s549-450x253.jpg',
  '2022/02/vlcsnap-2022-02-18-13h13m46s994-450x253.jpg',
  '2022/05/vlcsnap-2022-05-07-16h50m09s073-450x253-1-450x253.jpg',
  '2022/01/vlcsnap-2022-01-14-07h36m56s475-450x253.jpg',
  '2022/02/vlcsnap-2022-02-01-11h26m02s606-450x253-2-450x253.jpg',
  '2022/02/vlcsnap-2022-02-18-13h18m12s894-450x253-1-450x253.jpg',
  '2022/01/vlcsnap-2022-01-14-07h39m09s452-450x253.jpg',
  '2022/01/vlcsnap-2022-01-28-13h41m49s479-450x253.jpg',
  '2022/03/vlcsnap-2022-03-07-14h14m29s002-450x253.jpg',
  '2022/04/vlcsnap-2022-04-25-17h39m09s217-450x253-2-450x253.jpg',
  '2022/01/vlcsnap-2022-01-14-07h43m45s302-450x253.jpg',
  '2022/04/vlcsnap-2022-04-24-20h16m41s654-450x253-1-450x253.jpg',
  '2022/02/vlcsnap-2022-02-18-12h40m21s669-450x253-1-450x253.jpg',
  '2022/03/vlcsnap-2022-03-07-14h10m39s738-450x253.jpg',
  '2022/05/vlcsnap-2022-05-18-20h04m28s691-450x253-1-450x253.jpg'
];

// 4. ELEMENTO-CATEGORIAS-B (44 imágenes) - JPG a WebP, srcset inverso 205px desktop, 310px móvil
const ELEMENTO_CATEGORIAS_B_IMAGES = [
  '2022/02/vlcsnap-2022-02-18-12h38m46s585-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-22-11h25m13s387-300x169.jpg',
  '2022/02/vlcsnap-2022-02-22-11h24m22s374-300x169.jpg',
  '2022/02/vlcsnap-2022-02-22-11h23m55s577-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-24-13h03m20s970-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-24-13h04m30s384-300x169.jpg',
  '2022/02/vlcsnap-2022-02-23-13h31m59s988-450x253-1-300x169.jpg',
  '2022/03/vlcsnap-2022-03-07-14h12m30s936-300x169.jpg',
  '2022/04/vlcsnap-2022-04-25-17h40m43s684-450x253-1-300x169.jpg',
  '2022/05/vlcsnap-2022-05-18-19h56m54s776-450x253-1-300x169.jpg',
  '2022/05/vlcsnap-2022-05-18-20h06m47s773-450x253-1-300x169.jpg',
  '2022/01/vlcsnap-2022-01-15-21h18m15s521-300x169.jpg',
  '2022/01/vlcsnap-2022-01-14-07h39m34s675-300x169.jpg',
  '2022/02/vlcsnap-2022-02-18-12h39m13s208-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-22-11h24m08s932-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-24-13h05m02s015-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-24-13h05m10s230-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-24-13h04m49s392-300x169.jpg',
  '2022/03/vlcsnap-2022-03-07-14h29m55s621-300x169.jpg',
  '2022/03/vlcsnap-2022-03-14-14h58m17s123-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-24-13h03m48s712-450x253-1-300x169.jpg',
  '2022/05/vlcsnap-2022-05-18-20h17m42s352-450x253-1-300x169.jpg',
  '2022/05/vlcsnap-2022-05-18-20h01m29s762-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-18-12h38m13s320-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-18-12h39m44s290-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-22-11h24m53s051-300x169.jpg',
  '2022/02/vlcsnap-2022-02-23-13h36m37s693-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-24-13h05m19s585-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-23-13h37m10s747-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-22-11h22m38s289-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-22-11h23m02s137-450x253-1-300x169.jpg',
  '2022/04/vlcsnap-2022-04-27-12h08m55s547-300x169.jpg',
  '2022/05/vlcsnap-2022-05-18-20h17m14s013-450x253-1-300x169.jpg',
  '2022/01/vlcsnap-2022-01-14-07h38m32s081-300x169.jpg',
  '2022/02/vlcsnap-2022-02-18-12h38m28s525-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-23-13h37m25s063-300x169.jpg',
  '2022/02/vlcsnap-2022-02-24-13h04m05s402-450x253-1-300x169.jpg',
  '2022/02/vlcsnap-2022-02-23-13h34m02s961-300x169.jpg',
  '2022/05/vlcsnap-2022-05-18-20h06m13s392-450x253-1-300x169.jpg',
  '2022/05/vlcsnap-2022-05-18-20h07m36s417-450x253-1-300x169.jpg'
];

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

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

// ============================================
// 1. COMPRIMIR IMAGEN ORIGINAL (sin cambiar tamaño)
// ============================================
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

    // Comprimir según formato
    const isWebp = ext.toLowerCase() === '.webp';
    const isJpg = ['.jpg', '.jpeg'].includes(ext.toLowerCase());

    let sharpInstance = sharp(originalBuffer);

    if (isWebp) {
      sharpInstance = sharpInstance.webp({ quality: QUALITY });
    } else if (isJpg) {
      sharpInstance = sharpInstance.jpeg({ quality: QUALITY });
    }

    await sharpInstance.toFile(tempPath);

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

// ============================================
// 2. CREAR VERSIÓN MÓVIL (para preview: 651px)
// ============================================
async function createMobileVersion(relativePath, width = 651) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);

  if (!await fileExists(inputPath)) {
    return { path: relativePath, error: 'No existe' };
  }

  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const mobilePath = path.join(dir, `${base}-mobile${ext}`);

  try {
    const originalBuffer = await fs.readFile(inputPath);

    await sharp(originalBuffer)
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(mobilePath);

    const mobileStats = await fs.stat(mobilePath);
    return { path: relativePath, mobilePath: `${base}-mobile${ext}`, size: mobileStats.size };
  } catch (error) {
    return { path: relativePath, error: error.message };
  }
}

// ============================================
// 3. CREAR VERSIÓN DESKTOP (para srcset inverso)
// ============================================
async function createDesktopVersion(relativePath, width) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);

  if (!await fileExists(inputPath)) {
    return { path: relativePath, error: 'No existe' };
  }

  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const desktopPath = path.join(dir, `${base}-desktop.webp`);

  try {
    const originalBuffer = await fs.readFile(inputPath);

    await sharp(originalBuffer)
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(desktopPath);

    const desktopStats = await fs.stat(desktopPath);
    return { path: relativePath, desktopPath: `${base}-desktop.webp`, size: desktopStats.size };
  } catch (error) {
    return { path: relativePath, error: error.message };
  }
}

// ============================================
// 4. CONVERTIR JPG A WEBP Y REDIMENSIONAR
// ============================================
async function convertToWebpAndResize(relativePath, pcWidth, mobileWidth) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);

  if (!await fileExists(inputPath)) {
    return { path: relativePath, error: 'No existe' };
  }

  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);

  // Nuevos nombres WebP
  const webpPath = path.join(dir, `${base}.webp`);
  const desktopPath = path.join(dir, `${base}-desktop.webp`);

  try {
    const originalBuffer = await fs.readFile(inputPath);
    const originalSize = originalBuffer.length;

    // Crear versión principal (para móvil, que es más grande)
    await sharp(originalBuffer)
      .resize(mobileWidth, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(webpPath);

    // Crear versión desktop (más pequeña)
    await sharp(originalBuffer)
      .resize(pcWidth, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(desktopPath);

    const webpStats = await fs.stat(webpPath);
    const desktopStats = await fs.stat(desktopPath);

    return {
      path: relativePath,
      originalSize,
      webpPath: `${base}.webp`,
      webpSize: webpStats.size,
      desktopPath: `${base}-desktop.webp`,
      desktopSize: desktopStats.size,
      saved: originalSize - webpStats.size - desktopStats.size
    };
  } catch (error) {
    return { path: relativePath, error: error.message };
  }
}

// ============================================
// 5. ACTUALIZAR HTML
// ============================================
async function updateHtml() {
  let html = await fs.readFile(ASTRO_FILE, 'utf-8');
  let changes = 0;

  // 5.1 Fix PREVIEW srcset (patrón estándar)
  // De: srcset="...-mobile.webp 640w, ....webp 1080w" sizes="(max-width: 850px) 100vw, 1080px"
  // A:  srcset="...-mobile.webp 651w, ....webp 1000w" sizes="(max-width: 850px) 240px, 1000px"
  const previewRegex = /(<img[^>]*class="wv-preview-image"[^>]*srcset=")([^"]*-mobile\.webp)\s+\d+w,\s*([^"]*\.webp)\s+\d+w("\s*sizes=")[^"]*(")/g;
  html = html.replace(previewRegex, (match, p1, mobile, original, p4, p5) => {
    changes++;
    return `${p1}${mobile} 651w, ${original} 1000w${p4}(max-width: 850px) 240px, 1000px${p5}`;
  });

  // 5.2 Fix PERSONAJE8 srcset (srcset inverso: 125px desktop, 200px móvil)
  // Las imágenes ya tienen srcset incorrecto, necesitamos cambiarlo a desktop/original
  for (const img of PERSONAJE8_IMAGES) {
    const base = path.basename(img, path.extname(img));
    const dir = path.dirname(img);

    // Buscar patrón actual y reemplazar
    const currentPattern = new RegExp(
      `(src="/uploads/${dir}/${base}\\.webp"[^>]*srcset=")[^"]*("\\s*sizes=")[^"]*"`,
      'g'
    );

    const newSrcset = `/uploads/${dir}/${base}-desktop.webp 125w, /uploads/${dir}/${base}.webp 200w`;
    const newSizes = '(max-width: 900px) 200px, 125px';

    html = html.replace(currentPattern, (match, p1, p2) => {
      changes++;
      return `${p1}${newSrcset}${p2}${newSizes}"`;
    });
  }

  // 5.3 Fix ELEMENTO-CATEGORIAS (JPG a WebP con srcset inverso)
  for (const img of ELEMENTO_CATEGORIAS_IMAGES) {
    const ext = path.extname(img);
    const base = path.basename(img, ext);
    const dir = path.dirname(img);

    // Buscar la imagen actual (puede ser JPG o WebP ya existente)
    const currentPattern = new RegExp(
      `src="/uploads/${dir.replace(/\//g, '\\/')}/${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(jpg|webp)"([^>]*)loading="lazy"([^>]*)`,
      'g'
    );

    // Nuevo HTML con srcset inverso
    const newSrc = `/uploads/${dir}/${base}.webp`;
    const newSrcset = `/uploads/${dir}/${base}-desktop.webp 356w, /uploads/${dir}/${base}.webp 437w`;
    const newSizes = '(max-width: 900px) 437px, 356px';

    html = html.replace(currentPattern, (match, ext, before, after) => {
      changes++;
      // Limpiar srcset existente si lo hay
      let cleanBefore = before.replace(/srcset="[^"]*"\s*/g, '').replace(/sizes="[^"]*"\s*/g, '');
      let cleanAfter = after.replace(/srcset="[^"]*"\s*/g, '').replace(/sizes="[^"]*"\s*/g, '');
      return `src="${newSrc}"${cleanBefore}loading="lazy" srcset="${newSrcset}" sizes="${newSizes}"${cleanAfter}`;
    });
  }

  // 5.4 Fix ELEMENTO-CATEGORIAS-B (JPG a WebP con srcset inverso: 205px desktop, 310px móvil)
  for (const img of ELEMENTO_CATEGORIAS_B_IMAGES) {
    const ext = path.extname(img);
    const base = path.basename(img, ext);
    const dir = path.dirname(img);

    const currentPattern = new RegExp(
      `src="/uploads/${dir.replace(/\//g, '\\/')}/${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(jpg|webp)"([^>]*)loading="lazy"([^>]*)`,
      'g'
    );

    const newSrc = `/uploads/${dir}/${base}.webp`;
    const newSrcset = `/uploads/${dir}/${base}-desktop.webp 205w, /uploads/${dir}/${base}.webp 310w`;
    const newSizes = '(max-width: 900px) 310px, 205px';

    html = html.replace(currentPattern, (match, ext, before, after) => {
      changes++;
      let cleanBefore = before.replace(/srcset="[^"]*"\s*/g, '').replace(/sizes="[^"]*"\s*/g, '');
      let cleanAfter = after.replace(/srcset="[^"]*"\s*/g, '').replace(/sizes="[^"]*"\s*/g, '');
      return `src="${newSrc}"${cleanBefore}loading="lazy" srcset="${newSrcset}" sizes="${newSizes}"${cleanAfter}`;
    });
  }

  await fs.writeFile(ASTRO_FILE, html);
  return changes;
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('='.repeat(70));
  console.log('OPTIMIZACIÓN DE IMÁGENES - /anime/');
  console.log('='.repeat(70));

  let totalSaved = 0;
  let totalProcessed = 0;
  let errors = [];

  // ----------------------------------------
  // 1. PREVIEW IMAGES
  // ----------------------------------------
  console.log('\n📹 1. PREVIEW DEL REPRODUCTOR (1000px PC, 651px móvil)');
  console.log('-'.repeat(50));

  for (const img of PREVIEW_IMAGES) {
    // Comprimir original
    const compressResult = await compressImage(img);
    if (compressResult.error) {
      errors.push(`Preview ${img}: ${compressResult.error}`);
      continue;
    }

    if (compressResult.saved > 0) {
      console.log(`  ✓ ${img}`);
      console.log(`    Comprimido: ${formatBytes(compressResult.before)} → ${formatBytes(compressResult.after)} (${formatBytes(compressResult.saved)} ahorrado)`);
      totalSaved += compressResult.saved;
    }

    // Crear versión móvil
    const mobileResult = await createMobileVersion(img, 651);
    if (mobileResult.error) {
      errors.push(`Preview mobile ${img}: ${mobileResult.error}`);
    } else {
      console.log(`    Móvil creado: ${mobileResult.mobilePath} (${formatBytes(mobileResult.size)})`);
    }

    totalProcessed++;
  }

  // ----------------------------------------
  // 2. PERSONAJE8 IMAGES (srcset inverso)
  // ----------------------------------------
  console.log('\n👤 2. PERSONAJE8 (125px desktop, 200px móvil)');
  console.log('-'.repeat(50));

  for (const img of PERSONAJE8_IMAGES) {
    // Comprimir original
    const compressResult = await compressImage(img);
    if (compressResult.error) {
      errors.push(`Personaje8 ${img}: ${compressResult.error}`);
      continue;
    }

    if (compressResult.saved > 0) {
      console.log(`  ✓ ${img}`);
      console.log(`    Comprimido: ${formatBytes(compressResult.before)} → ${formatBytes(compressResult.after)}`);
      totalSaved += compressResult.saved;
    }

    // Crear versión desktop (125px)
    const desktopResult = await createDesktopVersion(img, 125);
    if (desktopResult.error) {
      errors.push(`Personaje8 desktop ${img}: ${desktopResult.error}`);
    } else {
      console.log(`    Desktop creado: ${desktopResult.desktopPath} (${formatBytes(desktopResult.size)})`);
    }

    totalProcessed++;
  }

  // ----------------------------------------
  // 3. ELEMENTO-CATEGORIAS (JPG a WebP)
  // ----------------------------------------
  console.log('\n🏷️ 3. ELEMENTO-CATEGORIAS (356px desktop, 437px móvil)');
  console.log('-'.repeat(50));

  for (const img of ELEMENTO_CATEGORIAS_IMAGES) {
    const result = await convertToWebpAndResize(img, 356, 437);
    if (result.error) {
      errors.push(`Elemento-categorias ${img}: ${result.error}`);
      continue;
    }

    console.log(`  ✓ ${img}`);
    console.log(`    Original: ${formatBytes(result.originalSize)}`);
    console.log(`    WebP (437px): ${result.webpPath} (${formatBytes(result.webpSize)})`);
    console.log(`    Desktop (356px): ${result.desktopPath} (${formatBytes(result.desktopSize)})`);

    if (result.saved > 0) totalSaved += result.saved;
    totalProcessed++;
  }

  // ----------------------------------------
  // 4. ELEMENTO-CATEGORIAS-B (JPG a WebP)
  // ----------------------------------------
  console.log('\n📂 4. ELEMENTO-CATEGORIAS-B (205px desktop, 310px móvil)');
  console.log('-'.repeat(50));

  for (const img of ELEMENTO_CATEGORIAS_B_IMAGES) {
    const result = await convertToWebpAndResize(img, 205, 310);
    if (result.error) {
      errors.push(`Elemento-categorias-b ${img}: ${result.error}`);
      continue;
    }

    console.log(`  ✓ ${img}`);
    console.log(`    WebP (310px): ${formatBytes(result.webpSize)}, Desktop (205px): ${formatBytes(result.desktopSize)}`);

    if (result.saved > 0) totalSaved += result.saved;
    totalProcessed++;
  }

  // ----------------------------------------
  // 5. ACTUALIZAR HTML
  // ----------------------------------------
  console.log('\n📝 5. ACTUALIZANDO HTML');
  console.log('-'.repeat(50));

  const htmlChanges = await updateHtml();
  console.log(`  ✓ ${htmlChanges} cambios realizados en index.astro`);

  // ----------------------------------------
  // RESUMEN
  // ----------------------------------------
  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN');
  console.log('='.repeat(70));
  console.log(`Total imágenes procesadas: ${totalProcessed}`);
  console.log(`Espacio ahorrado estimado: ${formatBytes(totalSaved)}`);
  console.log(`Cambios en HTML: ${htmlChanges}`);

  if (errors.length > 0) {
    console.log(`\n⚠️ ERRORES (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e}`));
  }
}

main().catch(console.error);
