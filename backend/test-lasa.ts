import { fuzzyFilter, applyTallManLettering } from './src/lib/lasa';

const medicines = [
  { name: 'Tramadol 50mg' },
  { name: 'Trazodone 50mg' },
  { name: 'Paracetamol Hapacol 500mg' },
  { name: 'Amoxicillin 500mg Imexpharm' },
  { name: 'Insulin Glargine Solostar' },
];

console.log("=========================================");
console.log("1. KIỂM TRA HIỂN THỊ TALL MAN LETTERING");
console.log("=========================================");
medicines.forEach(m => {
  console.log(`Gốc: ${m.name.padEnd(30)} => LASA: ${applyTallManLettering(m.name)}`);
});

console.log("\n=========================================");
console.log("2. KIỂM TRA TÌM KIẾM MỜ (FUZZY SEARCH)");
console.log("=========================================");
const search1 = 'tramdo';
console.log(`Tìm từ khóa sai chính tả: "${search1}"`);
const result1 = fuzzyFilter(medicines, search1, m => m.name);
console.log("Kết quả tìm được:", result1.map(r => applyTallManLettering(r.name)));

const search2 = 'amocxi';
console.log(`\Tìm từ khóa sai chính tả: "${search2}"`);
const result2 = fuzzyFilter(medicines, search2, m => m.name);
console.log("Kết quả tìm được:", result2.map(r => applyTallManLettering(r.name)));
