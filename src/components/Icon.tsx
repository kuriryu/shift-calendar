/** Google Material Symbols を使うアイコンコンポーネント */
export default function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
      aria-hidden
    >
      {name}
    </span>
  );
}
