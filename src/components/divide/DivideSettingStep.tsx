"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DivideSettingStepProps = {
  memberCount: number;
  onBack: () => void;
  onNext: (settings: DivideSettings) => void;
};

export type DivideSettings = {
  divideBy: "team_count" | "members_per_team";
  value: number;
  method: "random" | "gender_equal";
};

export function DivideSettingStep({ memberCount, onBack, onNext }: DivideSettingStepProps) {
  const [divideBy, setDivideBy] = useState<"team_count" | "members_per_team">("team_count");
  const [value, setValue] = useState(2);
  const [method, setMethod] = useState<"random" | "gender_equal">("random");

  // バリデーション
  const getError = (): string | null => {
    if (value < 1) return "1以上の値を入力してください";
    if (divideBy === "team_count" && value > memberCount) {
      return `チーム数は参加者数（${memberCount}人）以下にしてください`;
    }
    if (divideBy === "members_per_team" && value > memberCount) {
      return `1チームの人数は参加者数（${memberCount}人）以下にしてください`;
    }
    return null;
  };

  const error = getError();

  const handleNext = () => {
    if (error) return;
    onNext({ divideBy, value, method });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-1">チーム分け設定</h3>
        <p className="text-sm text-muted-foreground">
          {memberCount}人を振り分けます
        </p>
      </div>

      {/* 分け方 */}
      <div className="space-y-3">
        <Label className="font-medium">分け方</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border hover:bg-accent/50 transition-colors">
            <input
              type="radio"
              name="divideBy"
              value="team_count"
              checked={divideBy === "team_count"}
              onChange={() => setDivideBy("team_count")}
              className="h-4 w-4"
            />
            <span>チーム数を指定</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border hover:bg-accent/50 transition-colors">
            <input
              type="radio"
              name="divideBy"
              value="members_per_team"
              checked={divideBy === "members_per_team"}
              onChange={() => setDivideBy("members_per_team")}
              className="h-4 w-4"
            />
            <span>1チームの人数を指定</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={memberCount}
            value={value}
            onChange={(e) => setValue(parseInt(e.target.value) || 1)}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">
            {divideBy === "team_count" ? "チーム" : "人/チーム"}
          </span>
        </div>
      </div>

      {/* 振り分け方式 */}
      <div className="space-y-3">
        <Label className="font-medium">振り分け方式</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border hover:bg-accent/50 transition-colors">
            <input
              type="radio"
              name="method"
              value="random"
              checked={method === "random"}
              onChange={() => setMethod("random")}
              className="h-4 w-4"
            />
            <div>
              <span className="font-medium">ランダム</span>
              <p className="text-xs text-muted-foreground">完全ランダムに振り分けます</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border hover:bg-accent/50 transition-colors">
            <input
              type="radio"
              name="method"
              value="gender_equal"
              checked={method === "gender_equal"}
              onChange={() => setMethod("gender_equal")}
              className="h-4 w-4"
            />
            <div>
              <span className="font-medium">男女均等</span>
              <p className="text-xs text-muted-foreground">男女の人数が均等になるよう振り分けます</p>
            </div>
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          ← 戻る
        </Button>
        <Button onClick={handleNext} disabled={!!error}>
          チーム分け実行 →
        </Button>
      </div>
    </div>
  );
}
