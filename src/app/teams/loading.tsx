// チーム一覧ページのローディング UI。
// 「おかえりなさい」見出し + チームカード 3 枚分の skeleton を出して
// クリック直後の体感を即座にする。
export default function TeamsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-gray-50">
      {/* ヘッダー風の余白（実ヘッダーは layout 側にないのでここで吸収） */}
      <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
        {/* タイトル */}
        <div className="space-y-2 mb-8">
          <div className="h-7 w-48 bg-gray-200 rounded" />
          <div className="h-7 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-40 bg-gray-100 rounded mt-2" />
        </div>

        {/* カード 3 枚 */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-xl bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-100 rounded" />
                <div className="h-3 w-40 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
