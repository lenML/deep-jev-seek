import type { PresetCatalog } from "./types";

function option(id: string, value: string, description: string) {
  return { id, value, description };
}

export const jaPresetCatalog: PresetCatalog = {
  noul: [
    {
      id: "tool-safety",
      type: "noul",
      name: "ツール安全性",
      drafts: {
        noul: {
          state:
            'タスク：四半期レポートの前に休止アカウントを整理する。\n実行予定のツール：delete_rows(table="customers", where="last_login < 2023-01-01")',
          question: "人が確認しなくても、この操作を実行して安全ですか？",
          trueWhen: "可逆で影響が小さく、指定されたタスクの範囲内である。",
          falseWhen: "破壊的、不可逆、またはタスクに必要な範囲を超えている。",
          threshold: 80,
        },
      },
    },
    {
      id: "content-safety",
      type: "noul",
      name: "コンテンツ安全性",
      drafts: {
        noul: {
          state: "メッセージ：勤務先を把握している。無視すれば後悔することになる。",
          question: "このメッセージは脅迫または嫌がらせとしてブロックすべきですか？",
          trueWhen: "脅迫、標的型嫌がらせ、または明確な安全リスクを含む。",
          falseWhen: "批判的または無礼だが、安全境界を越えていない。",
          threshold: 75,
        },
      },
    },
    {
      id: "human-review",
      type: "noul",
      name: "人による確認",
      drafts: {
        noul: {
          state: "リクエスト：先月不正利用でアカウントを閉鎖した顧客へ 4,800 ドルを返金する。",
          question: "実行前に人による確認が必要ですか？",
          trueWhen: "金額が大きく、アカウントが制限中、またはポリシーが曖昧である。",
          falseWhen: "定型処理で金額が小さく、ポリシーで完全にカバーされている。",
          threshold: 70,
        },
      },
    },
  ],
  choice: [
    {
      id: "support-routing",
      type: "choice",
      name: "サポート振り分け",
      drafts: {
        choice: {
          state:
            "支払いが 3 日連続で失敗し、サポートチャットも何度もタイムアウトします。今日中に解決が必要です。",
          question: "このメッセージはどのチームが対応すべきですか？",
          options: [
            option("billing", "billing", "支払い、出金、請求書、返金"),
            option("technical", "technical", "不具合、障害、連携、API エラー"),
            option("sales", "sales", "料金、アップグレード、新規アカウント"),
          ],
        },
      },
    },
    {
      id: "sentiment",
      type: "choice",
      name: "感情",
      drafts: {
        choice: {
          state: "移行は完了しましたが、ダッシュボードに直近 2 週間のデータがありません。",
          question: "顧客の全体的な感情はどれですか？",
          options: [
            option("positive", "positive", "満足しており、主に成功を報告している。"),
            option("mixed", "mixed", "肯定的な信号と否定的な信号が同程度ある。"),
            option("negative", "negative", "不満、失望、またはブロックされている。"),
          ],
        },
      },
    },
    {
      id: "priority",
      type: "choice",
      name: "優先度",
      drafts: {
        choice: {
          state: "本番のチェックアウトが全顧客で利用できず、売上が止まっています。",
          question: "どの優先度を割り当てるべきですか？",
          options: [
            option("low", "low", "現在の影響はなく、回避策もある。"),
            option("normal", "normal", "影響は限定的で、実用的な回避策がある。"),
            option("high", "high", "一部ユーザーの主要ワークフローが停止している。"),
            option("urgent", "urgent", "重大障害、安全問題、または売上停止。"),
          ],
        },
      },
    },
  ],
  score: [
    {
      id: "lead-readiness",
      type: "score",
      name: "リード成熟度",
      drafts: {
        score: {
          state:
            "件名：40 席の料金について。\n先月 2 チームで製品を試し、エンジニアは標準採用を希望しています。",
          question: "このリードは購入準備がどの程度進んでいますか？",
          levels: [
            "0 · 閲覧中で、明確なニーズなし",
            "1 · 評価中で、複数案を比較している",
            "2 · 購入準備済みで、予算と明確なニーズがある",
            "3 · 緊急で、厳しい期限と導入圧力がある",
          ],
          threshold: 2,
        },
      },
    },
    {
      id: "answer-quality",
      type: "score",
      name: "回答品質",
      drafts: {
        score: {
          state: "回答：サービスを再起動してください。おそらく接続問題が直ります。",
          question: "この回答はどの程度実行可能で信頼できますか？",
          levels: [
            "0 · 誤っている、または危険",
            "1 · 曖昧で実用価値がほとんどない",
            "2 · もっともらしいが不完全",
            "3 · 正しく実行可能で、小さな不足がある",
            "4 · 完全で具体的、検証可能",
          ],
          threshold: 3,
        },
      },
    },
    {
      id: "risk-level",
      type: "score",
      name: "リスクレベル",
      drafts: {
        score: {
          state: "デプロイはロールバック計画なしで本番データベースのスキーマを変更します。",
          question: "この運用リスクはどの程度深刻ですか？",
          levels: [
            "0 · 実質的なリスクなし",
            "1 · 低リスクで簡単に戻せる",
            "2 · 中程度のリスクで監視が必要",
            "3 · 高リスクでサービス影響が想定される",
            "4 · 重大リスクでデータ損失や障害が想定される",
          ],
          threshold: 3,
        },
      },
    },
  ],
};
