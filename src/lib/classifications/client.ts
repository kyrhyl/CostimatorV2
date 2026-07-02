export interface ClassificationOption {
  _id: string;
  part: string;
  category: string;
  subCategory?: string;
  displayLabel: string;
  isActive?: boolean;
}

export function getCategoriesForPart(rows: ClassificationOption[], part: string) {
  return Array.from(
    new Set(
      rows
        .filter((row) => row.part === part)
        .map((row) => String(row.category || '').trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

export function getSubCategoriesForPartCategory(rows: ClassificationOption[], part: string, category: string) {
  return Array.from(
    new Set(
      rows
        .filter((row) => row.part === part && String(row.category || '').trim() === category)
        .map((row) => String(row.subCategory || '').trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

export function findClassificationId(rows: ClassificationOption[], part: string, category: string, subCategory: string) {
  return rows.find(
    (row) => row.part === part
      && String(row.category || '').trim() === category
      && String(row.subCategory || '').trim() === subCategory,
  )?._id || rows.find(
    (row) => row.part === part
      && String(row.category || '').trim() === category
      && !String(row.subCategory || '').trim()
      && !subCategory,
  )?._id || '';
}
