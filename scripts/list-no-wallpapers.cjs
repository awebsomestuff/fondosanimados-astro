const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', 'src', 'pages');
const noWallpapers = [];

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.astro')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes('class="wv-wallpaper"')) {
        const relativePath = filePath.replace(pagesDir, '').replace(/\\/g, '/');
        noWallpapers.push(relativePath);
      }
    }
  }
}

walkDir(pagesDir);
console.log('Páginas SIN wallpapers (' + noWallpapers.length + '):\n');
noWallpapers.sort().forEach(p => console.log(p));
