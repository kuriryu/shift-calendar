/** スタッフIDから安定した色を割り当てる（セッション中も persist 後も変わらない） */

export type StaffColor = {
  /** ガントバー・チップの背景 */
  bg: string;
  /** テキスト（白背景上の名前など） */
  text: string;
  /** 薄い背景（セル塗り） */
  soft: string;
  /** カレンダーのドット */
  dot: string;
};

const PALETTE: StaffColor[] = [
  { bg: "#4f46e5", text: "#3730a3", soft: "#e0e7ff", dot: "#4f46e5" }, // indigo
  { bg: "#059669", text: "#065f46", soft: "#d1fae5", dot: "#059669" }, // emerald
  { bg: "#d97706", text: "#92400e", soft: "#fef3c7", dot: "#d97706" }, // amber
  { bg: "#db2777", text: "#9d174d", soft: "#fce7f3", dot: "#db2777" }, // pink
  { bg: "#0891b2", text: "#155e75", soft: "#cffafe", dot: "#0891b2" }, // cyan
  { bg: "#7c3aed", text: "#5b21b6", soft: "#ede9fe", dot: "#7c3aed" }, // violet
  { bg: "#dc2626", text: "#991b1b", soft: "#fee2e2", dot: "#dc2626" }, // red
  { bg: "#0d9488", text: "#115e59", soft: "#ccfbf1", dot: "#0d9488" }, // teal
  { bg: "#ea580c", text: "#9a3412", soft: "#ffedd5", dot: "#ea580c" }, // orange
  { bg: "#2563eb", text: "#1e40af", soft: "#dbeafe", dot: "#2563eb" }, // blue
  { bg: "#65a30d", text: "#3f6212", soft: "#ecfccb", dot: "#65a30d" }, // lime
  { bg: "#c026d3", text: "#86198f", soft: "#fae8ff", dot: "#c026d3" }, // fuchsia
];

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function staffColorOf(staffId: string): StaffColor {
  return PALETTE[hashId(staffId) % PALETTE.length];
}
