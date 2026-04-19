"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type NgPairWithUsers = {
  id: string;
  team_id: string;
  created_at: string;
  user_a: { id: string; name: string };
  user_b: { id: string; name: string };
};

type NgPairListProps = {
  pairs: NgPairWithUsers[];
  teamId: string;
  onDeleted: () => void;
};

export function NgPairList({ pairs, teamId, onDeleted }: NgPairListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (pair: NgPairWithUsers) => {
    if (!confirm(`${pair.user_a.name} × ${pair.user_b.name} のペアを削除しますか？`)) return;
    setDeletingId(pair.id);
    try {
      const res = await fetch(`/api/ng-pairs/${pair.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "削除に失敗しました");
        return;
      }

      toast.success("ペアを削除しました");
      onDeleted();
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setDeletingId(null);
    }
  };

  if (pairs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        ペアが登録されていません
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pairs.map((pair) => (
        <Card key={pair.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">
                {pair.user_a.name}
                <span className="text-muted-foreground mx-2">×</span>
                {pair.user_b.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                登録日：{format(new Date(pair.created_at), "yyyy/M/d HH:mm", { locale: ja })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => handleDelete(pair)}
              disabled={deletingId === pair.id}
            >
              削除
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
