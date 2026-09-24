import { redirect } from "next/navigation";

/** 旧 /create は統合後のトップへ */
export default function CreateRedirectPage() {
  redirect("/");
}
