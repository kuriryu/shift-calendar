import RedirectToStep from "@/components/RedirectToStep";

/** 旧URL (/day/YYYY-MM-DD) はトップの微調整ステップ（時間ビュー）に統合されたためリダイレクト */
export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  return <RedirectToStep step={6} date={date} />;
}
