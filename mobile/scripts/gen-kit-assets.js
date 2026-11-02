/**
 * Gera módulos TS com os SVGs do kit v05 a partir dos arquivos do web
 * (public/icons e public/map), para o app usar com react-native-svg.
 * Uso (na pasta mobile): node scripts/gen-kit-assets.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const outDir = path.resolve(__dirname, "..", "src", "generated");
fs.mkdirSync(outDir, { recursive: true });

const iconsDir = path.join(root, "public", "icons");
const names = fs.readdirSync(iconsDir).filter((f) => f.endsWith(".svg")).sort();

let icons =
  "// Gerado a partir de public/icons (kit v05). Não editar à mão: rode `node scripts/gen-kit-assets.js` na pasta mobile.\n\nexport const kitIcons = {\n";
for (const file of names) {
  const svg = fs.readFileSync(path.join(iconsDir, file), "utf8").trim();
  icons += `  ${JSON.stringify(file.replace(".svg", ""))}: ${JSON.stringify(svg)},\n`;
}
icons += "} as const;\n\nexport type KitIconName = keyof typeof kitIcons;\n";
fs.writeFileSync(path.join(outDir, "kit-icons.ts"), icons);

// O parser do react-native-svg (SvgXml) ignora <style>/classes CSS: as cores do web viram atributos.
const map = fs
  .readFileSync(path.join(root, "public", "map", "world-map.svg"), "utf8")
  .trim()
  .replace(/<style>[\s\S]*?<\/style>/, "")
  .replace(/ class="world-map"/, "")
  // Atributos só de DOM (o rótulo acessível fica na View que envolve o mapa no app)
  .replace(/ (role|aria-label)="[^"]*"/g, "")
  .replace(/ data-country="[^"]*"/g, "")
  .replace(/<path class="country" id="country-BRA"/, '<path id="country-BRA" fill="#F7C928" stroke="#123A32" stroke-width="0.5"')
  .replace(/<path class="country"/g, '<path fill="#123A32" stroke="#FFF9E8" stroke-width="0.5"');
if (/class=|<style|data-|aria-/.test(map)) throw new Error("world-map.svg ainda tem CSS; ajuste o gerador.");
fs.writeFileSync(
  path.join(outDir, "world-map.ts"),
  `// Gerado a partir de public/map/world-map.svg (mesmas cores do web).\n\nexport const worldMapSvg = ${JSON.stringify(map)};\n`,
);

console.log(`${names.length} ícones e o mapa gerados em ${path.relative(root, outDir)}`);
