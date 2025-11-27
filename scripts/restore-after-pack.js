const fs = require('fs');
const path = require('path');

console.log('恢复pnpm符号链接...\n');

const projectRoot = path.join(__dirname, '..');
const nodeModules = path.join(projectRoot, 'node_modules');
const nodeModulesSymlink = path.join(projectRoot, 'node_modules_symlink');

if (fs.existsSync(nodeModulesSymlink)) {
  console.log('删除真实node_modules...');
  fs.rmSync(nodeModules, { recursive: true, force: true });
  
  console.log('恢复符号链接版本...');
  fs.renameSync(nodeModulesSymlink, nodeModules);
  
  console.log('✅ 恢复完成!\n');
} else {
  console.log('没有找到备份，无需恢复\n');
}
