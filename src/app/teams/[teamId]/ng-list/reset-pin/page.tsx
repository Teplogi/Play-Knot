"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPinPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const teamId = params.teamId as string;
  const token = searchParams.get("token") || "";

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error("4桁の数字を入力してください");
      return;
    }
    if (pin !== confirm) {
      toast.error("PINが一致しません");
      return;
    }
    if (!token) {
      toast.error("リセットトークンが無効です");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ng-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, action: "reset-confirm", token, pin }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "リセットに失敗しました");
      }
      setDone(true);
      toast.success("PINを再設定しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PINの再設定に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="font-bold text-gray-900">PIN を再設定しました</h2>
          <p className="text-sm text-gray-500">設定画面に戻り、新しい PIN で NGリストにアクセスしてください。</p>
          <Button onClick={() => window.location.href = `/teams/${teamId}/settings`} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 w-full">
            設定画面に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-sm w-full space-y-5">
        <div>
          <h2 className="font-bold text-gray-900">NGリスト PIN 再設定</h2>
          <p className="text-xs text-gray-500 mt-1">新しい4桁のPINを設定してください。</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="reset-pin">新しい PIN (4桁の数字)</Label>
            <Input
              id="reset-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="****"
              className="w-32 text-center tracking-[0.5em]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reset-pin-confirm">PIN (確認)</Label>
            <Input
              id="reset-pin-confirm"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
              placeholder="****"
              className="w-32 text-center tracking-[0.5em]"
            />
          </div>
        </div>

        <Button
          onClick={handleReset}
          disabled={saving || pin.length !== 4 || confirm.length !== 4}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 w-full"
        >
          {saving ? "設定中..." : "PINを再設定する"}
        </Button>
      </div>
    </div>
  );
}
