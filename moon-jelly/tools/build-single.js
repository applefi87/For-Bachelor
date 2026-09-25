#!/usr/bin/env node
/*
 * 把 index.html、style.css 和 js/ 底下的腳本合成一個 HTML 檔，方便分享或放到任何地方。
 *
 *   node tools/build-single.js dist/moon-jelly.html
 *   node tools/build-single.js out.html --fragment   （只輸出 <body> 內容，給會自己包外殼的平台用）
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const fragment = args.includes('--fragment');
const out = args.find((a) => !a.startsWith('--')) || path.join(root, 'dist', 'moon-jelly.html');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const js = scripts
  .map((src) => '/* ' + src + ' */\n' + fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script'))
  .join('\n');

const pick = (re) => {
  const m = html.match(re);
  if (!m) throw new Error('index.html 裡找不到 ' + re);
  return m[1];
};
const title = pick(/<title>([\s\S]*?)<\/title>/);
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/)[0];
const body = pick(/<!--BODY-->([\s\S]*?)<!--\/BODY-->/);
const boot = "document.body.classList.add('intro');\nMJ.Game.init();";

let result;
if (fragment) {
  result =
    '<title>' + title + '</title>\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    fonts + '\n<style>\n' + css + '\n</style>\n' +
    body + '\n<script>\n' + js + '\n' + boot + '\n</script>\n';
} else {
  result = html
    .replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')
    .replace(/(<script src="[^"]+"><\/script>\s*)+<script>MJ\.Game\.init\(\);<\/script>/, '<script>\n' + js + '\n' + boot + '\n</script>');
}

fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, result);
console.log('寫好了：' + out + '（' + Math.round(result.length / 1024) + ' KB）');
