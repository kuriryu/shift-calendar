import { redirect } from "next/navigation";

/** 日付の編集はシフト表の中で行う */
export default function DayPage() {
  redirect("/shifts");
}
