/**
 * Thuật toán tính khoảng cách Levenshtein giữa 2 chuỗi
 * Khoảng cách càng nhỏ, 2 chuỗi càng giống nhau.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // thay thế
          matrix[i][j - 1] + 1,     // chèn
          matrix[i - 1][j] + 1      // xóa
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Tính điểm tương đồng giữa 2 chuỗi dựa trên khoảng cách Levenshtein.
 * Trả về 0 đến 1. Điểm càng gần 1 càng giống nhau.
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8; // Ưu tiên nếu chuỗi chứa lẫn nhau
  
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(s1, s2);
  return (maxLength - distance) / maxLength;
}

/**
 * Lọc mảng đối tượng dựa trên fuzzy search (dùng similarity score)
 * Điểm > 0.4 được coi là khớp tạm ổn (có thể sai 1-2 ký tự)
 */
export function fuzzyFilter<T>(items: T[], query: string, keyExtractor: (item: T) => string): T[] {
  if (!query || query.trim() === '') return items;

  const threshold = 0.4;
  const results = items
    .map(item => ({
      item,
      score: stringSimilarity(query, keyExtractor(item))
    }))
    .filter(res => res.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return results.map(res => res.item);
}

/**
 * Danh sách Tall Man Lettering chuẩn ISMP / FDA
 * Định dạng: key là tên lowercase thuần túy, value là tên được nhấn mạnh in hoa khác biệt
 */
export const TALL_MAN_DICTIONARY: Record<string, string> = {
  // Các cặp cực kỳ phổ biến và nguy hiểm
  'tramadol': 'traMAdol',
  'trazodone': 'traZOdone',
  'prednisone': 'predniSONE',
  'prednisolone': 'predniSOLONE',
  'clozapine': 'cloZAPine',
  'clonazepam': 'cloNAZEpam',
  'ephedrine': 'epheDRine',
  'epinephrine': 'epINEPHrine',
  'dobutamine': 'DOBUTamine',
  'dopamine': 'DOPamine',
  'novolin': 'NOVOLIN',
  'novolog': 'NOVOLOG',
  'humulin': 'HUMULIN',
  'humalog': 'HUMALOG',
  'cefotaxime': 'cefoTAXime',
  'ceftriaxone': 'cefTRIAXone',
  'ceftazidime': 'cefTAZidime',
  'hydralazine': 'hydrALAzine',
  'hydroxyzine': 'hydrOXYzine',
  'glipizide': 'glipiZIDE',
  'glyburide': 'glyBURIDE',
  
  // Các thuốc hiện có trong seed data của hệ thống
  'amoxicillin': 'amoxiCILLIN',
  'ampicillin': 'ampiCILLIN',
  'diazepam': 'diaZEPAM',
  'diltiazem': 'dilTIAZEM',
  'paracetamol': 'PARAcetamol',
  'piracetam': 'PIRAcetam',
  'glargine': 'GLARgine',
  'lispro': 'LISpro',
};

/**
 * Phân tích và áp dụng định dạng Tall Man Lettering nếu thuốc nằm trong danh mục LASA
 */
export function applyTallManLettering(medicineName: string): string {
  if (!medicineName) return medicineName;
  
  const lowerName = medicineName.toLowerCase().trim();
  
  // So khớp với từ điển
  for (const [key, tallMan] of Object.entries(TALL_MAN_DICTIONARY)) {
    if (lowerName.includes(key)) {
      // Dùng Regex không phân biệt hoa thường để thay thế (đảm bảo giữ lại các hậu tố/tiền tố nếu có)
      const regex = new RegExp(key, 'ig');
      return medicineName.replace(regex, tallMan);
    }
  }
  
  return medicineName;
}
