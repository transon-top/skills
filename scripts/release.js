import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const validTypes = ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease'];
const type = process.argv[2];

if (!type || !validTypes.includes(type)) {
  console.error(`用法: node scripts/release.js <${validTypes.join('|')}>`);
  console.error('示例: node scripts/release.js patch   # v0.0.1');
  console.error('示例: node scripts/release.js minor   # v0.1.0');
  console.error('示例: node scripts/release.js major   # v1.0.0');
  process.exit(1);
}

const pkgPath = resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

let newVersion;
switch (type) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
  default:
    console.error(`不支持的类型: ${type}`);
    process.exit(1);
}

const oldVersion = pkg.version;
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

const tag = `v${newVersion}`;
execSync(`git add package.json`, { stdio: 'inherit' });
execSync(`git commit -m "${tag}"`, { stdio: 'inherit' });
execSync(`git tag ${tag}`, { stdio: 'inherit' });

console.log(`版本已更新: ${oldVersion} → ${newVersion}`);
console.log(`tag 已创建: ${tag}`);
