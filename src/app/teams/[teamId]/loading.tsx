// チーム配下ページの共通ローディング UI。
// Link クリック直後に Next.js がこれを表示して
// 「クリック → 即タブ切替 → スケルトン → データ」の体感を作る。
// レイアウト（TeamNav）はそのままで中身だけが差し替わる。
export default function TeamPageLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* タイトル */}
      <div className="h-7 w-32 bg-gray-200 rounded" />

      {/* カード 1 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="h-4 w-40 bg-gray-200 rounded" />
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
        <div className="h-4 w-1/2 bg-gray-200 rounded" />
      </div>

      {/* カード 2 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-16 w-full bg-gray-100 rounded" />
        <div className="h-16 w-full bg-gray-100 rounded" />
      </div>

      {/* カード 3 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="h-4 w-28 bg-gray-200 rounded" />
        <div className="h-4 w-2/3 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
