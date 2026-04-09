import { redirect } from "next/navigation";

export default function Home() {
  // proxy.ts で認証チェック済み：未ログイン→/login、ログイン済み→/teams にリダイレクト
  redirect("/teams");
}
