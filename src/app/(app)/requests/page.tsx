import { redirect } from "next/navigation";

/** 希望入力は公開URLと受付画面へ移した */
export default function RequestsPage() {
  redirect("/reception");
}
