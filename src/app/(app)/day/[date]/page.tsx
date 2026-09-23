import DayTimeline from "@/components/DayTimeline";

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  return <DayTimeline date={date} />;
}
