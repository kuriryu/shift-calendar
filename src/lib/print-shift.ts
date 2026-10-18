import type { ShiftAssignment, Staff } from "@/types";
import { daysOfMonth, weekdayLabel } from "@/lib/dates";
import { staffLabel } from "@/lib/store-book";

const PAGE_W = 1240;
const PAGE_H = 1754;

export function drawShiftJpeg(input: {
  storeName: string;
  month: string;
  monthLabel: string;
  staff: Staff[];
  assignments: ShiftAssignment[];
}): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 28px sans-serif";
  ctx.fillText(`${input.storeName}  ${input.monthLabel}シフト`, 36, 52);
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText("A4 / 1枚", 36, 78);

  const monthDays = daysOfMonth(input.month);
  const people = input.staff;
  const rowH = Math.max(18, Math.min(36, Math.floor((PAGE_H - 140) / Math.max(people.length, 1))));
  const nameW = 120;
  const tableW = PAGE_W - 72 - nameW;
  const colW = tableW / Math.max(monthDays.length, 1);

  ctx.strokeStyle = "#cbd5e1";
  ctx.fillStyle = "#0f172a";
  ctx.font = "11px sans-serif";
  monthDays.forEach((date, index) => {
    const x = 36 + nameW + index * colW;
    ctx.fillText(String(Number(date.slice(8))), x + 2, 112);
    ctx.fillText(weekdayLabel(date), x + 2, 126);
  });

  people.forEach((member, row) => {
    const y = 140 + row * rowH;
    ctx.fillStyle = row % 2 === 0 ? "#f8fafc" : "#ffffff";
    ctx.fillRect(36, y, PAGE_W - 72, rowH);
    ctx.fillStyle = "#0f172a";
    ctx.font = "12px sans-serif";
    ctx.fillText(staffLabel(member), 42, y + rowH * 0.68);
    monthDays.forEach((date, index) => {
      const assignment = input.assignments.find(
        (item) => item.staffId === member.id && item.date === date,
      );
      const x = 36 + nameW + index * colW;
      ctx.strokeRect(x, y, colW, rowH);
      if (!assignment) return;
      ctx.fillStyle = "#1d4ed8";
      ctx.font = "10px sans-serif";
      const label = `${assignment.startTime.slice(0, 5)}`;
      ctx.fillText(label, x + 2, y + rowH * 0.62);
      ctx.fillStyle = "#0f172a";
    });
  });

  ctx.strokeRect(36, 140, PAGE_W - 72, rowH * Math.max(people.length, 1));
  return canvas;
}

export async function downloadJpeg(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) return;
  downloadBlob(blob, filename);
}

export async function downloadPdf(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) return;
  const jpeg = new Uint8Array(await blob.arrayBuffer());
  const pdf = jpegToPdf(jpeg, canvas.width, canvas.height);
  const bytes = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function jpegToPdf(jpeg: Uint8Array, width: number, height: number): Uint8Array {
  const pageW = 595;
  const pageH = 842;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let length = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };

  push("%PDF-1.3\n");
  offsets[1] = length;
  push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n");
  offsets[2] = length;
  push("2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n");
  offsets[3] = length;
  push(
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >> endobj\n`,
  );
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q\n`;
  offsets[4] = length;
  push(`4 0 obj << /Length ${encoder.encode(content).length} >> stream\n${content}endstream endobj\n`);
  offsets[5] = length;
  push(
    `5 0 obj << /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >> stream\n`,
  );
  push(jpeg);
  push("\nendstream endobj\n");
  const xref = length;
  let xrefBody = `xref\n0 6\n0000000000 65535 f \n`;
  for (let id = 1; id <= 5; id += 1) {
    xrefBody += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  push(xrefBody);
  push(`trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  const out = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}
