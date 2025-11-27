const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('准备打包：解析pnpm符号链接...\n');

const projectRoot = path.join(__dirname, '..');
const nodeModules = path.join(projectRoot, 'node_modules');
const nodeModulesReal = path.join(projectRoot, 'node_modules_real');

// 1. 删除旧的真实node_modules
if (fs.existsSync(nodeModulesReal)) {
  console.log('删除旧的node_modules_real...');
  fs.rmSync(nodeModulesReal, { recursive: true, force: true });
}

// 2. 使用cp命令复制整个node_modules，跟随符号链接
console.log('复制node_modules（跟随符号链接）...');
console.log('这可能需要几分钟，请耐心等待...\n');

try {
  // 使用cp -LR来跟随符号链接复制
  execSync(`cp -LR "${nodeModules}" "${nodeModulesReal}"`, {
    stdio: 'inherit',
    maxBuffer: 1024 * 1024 * 100 // 100MB buffer
  });
  
  console.log('\n✅ node_modules复制完成!');
  
  // 3. 重命名
  console.log('重命名目录...');
  fs.renameSync(nodeModules, path.join(projectRoot, 'node_modules_symlink'));
  fs.renameSync(nodeModulesReal, nodeModules);
  
  console.log('✅ 准备完成! 现在可以运行electron-builder打包了\n');
  console.log('打包完成后，运行以下命令恢复：');
  console.log('  rm -rf node_modules');
  console.log('  mv node_modules_symlink node_modules');
  
} catch (error) {
  console.error('❌ 复制失败:', error.message);
  process.exit(1);
}
