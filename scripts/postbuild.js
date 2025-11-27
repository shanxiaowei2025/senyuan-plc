const fs = require('fs');
const path = require('path');

// 复制静态文件到 standalone 目录
function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    files.forEach(file => {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    });
  }
}

console.log('📦 复制静态资源到 standalone 目录...');

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');

// 复制 public 文件夹
const publicSource = path.join(__dirname, '..', 'public');
const publicTarget = path.join(standaloneDir, 'public');
if (fs.existsSync(publicSource)) {
  console.log('  - 复制 public/');
  copyFolderRecursiveSync(publicSource, publicTarget);
}

// 复制 .next/static 文件夹
const staticSource = path.join(__dirname, '..', '.next', 'static');
const staticTarget = path.join(standaloneDir, '.next', 'static');
if (fs.existsSync(staticSource)) {
  console.log('  - 复制 .next/static/');
  copyFolderRecursiveSync(staticSource, staticTarget);
}

console.log('✅ 静态资源复制完成!');
