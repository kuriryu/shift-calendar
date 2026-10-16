import { redirect } from "next/navigation";

/** 旧ウィザードは店舗ワークスペースへ移した */
export default function CreateRedirectPage() {
  redirect("/dashboard");
}
