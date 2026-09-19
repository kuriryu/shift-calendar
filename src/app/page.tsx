import { createClient } from "@/lib/supabase/server";
import ShiftCalendar from "@/components/ShiftCalendar";
import SignOutButton from "@/components/SignOutButton";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-full flex-1 flex-col px-4 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <p className="text-sm text-slate-600">{user?.email}</p>
        <SignOutButton />
      </div>
      <div className="mt-6 flex flex-1 items-center justify-center">
        <ShiftCalendar />
      </div>
    </main>
  );
}
