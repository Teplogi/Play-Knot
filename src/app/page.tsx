import { redirect } from "next/navigation";

export default function Home() {
  // TODO: Supabase接続後に "/login" に戻す
  redirect("/teams");
}
