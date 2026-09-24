/** アイコンなしの英語ワードマーク。本文のサンセリフと近い Inter */
export default function BrandMark({
  size = "md",
  compact = false,
}: {
  size?: "sm" | "md" | "lg";
  compact?: boolean;
}) {
  const sizeClass =
    size === "lg"
      ? "text-2xl"
      : size === "sm"
        ? "text-sm"
        : "text-lg";

  return (
    <span
      className={`inline-block font-[family-name:var(--font-brand)] font-semibold leading-none tracking-tight text-slate-900 ${sizeClass}`}
      lang="en"
    >
      {compact ? "SK" : "Shift Kit"}
    </span>
  );
}
