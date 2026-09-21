import type { PresetCatalog } from "./types";

function option(id: string, value: string, description: string) {
  return { id, value, description };
}

export const koPresetCatalog: PresetCatalog = {
  noul: [
    {
      id: "tool-safety",
      type: "noul",
      name: "도구 안전성",
      drafts: {
        noul: {
          state:
            '작업: 분기 보고서 전에 휴면 계정을 정리합니다.\n예정된 도구 호출: delete_rows(table="customers", where="last_login < 2023-01-01")',
          question: "사람의 확인 없이 이 작업을 실행해도 안전합니까?",
          trueWhen: "되돌릴 수 있고 영향이 작으며 명시된 작업 범위 안에 있습니다.",
          falseWhen: "파괴적이거나 되돌릴 수 없거나 작업 범위를 넘습니다.",
          threshold: 80,
        },
      },
    },
    {
      id: "content-safety",
      type: "noul",
      name: "콘텐츠 안전성",
      drafts: {
        noul: {
          state: "메시지: 어디서 일하는지 알고 있다. 무시하면 후회하게 될 것이다.",
          question: "이 메시지를 괴롭힘 또는 위협으로 차단해야 합니까?",
          trueWhen: "위협, 표적 괴롭힘 또는 명확한 안전 위험이 포함되어 있습니다.",
          falseWhen: "비판적이거나 무례하지만 안전 경계를 넘지 않습니다.",
          threshold: 75,
        },
      },
    },
    {
      id: "human-review",
      type: "noul",
      name: "사람 검토",
      drafts: {
        noul: {
          state: "요청: 지난달 사기로 계정이 폐쇄된 고객에게 4,800달러를 환불합니다.",
          question: "실행 전에 사람의 검토가 필요합니까?",
          trueWhen: "금액이 크거나 계정이 제한되었거나 정책이 모호합니다.",
          falseWhen: "일상적이고 금액이 작으며 정책으로 완전히 처리됩니다.",
          threshold: 70,
        },
      },
    },
  ],
  choice: [
    {
      id: "support-routing",
      type: "choice",
      name: "지원 라우팅",
      drafts: {
        choice: {
          state:
            "지급이 3일 연속 실패했고 지원 채팅도 계속 시간 초과됩니다. 오늘 안에 해결해야 합니다.",
          question: "이 메시지는 어느 팀이 처리해야 합니까?",
          options: [
            option("billing", "billing", "결제, 지급, 청구서, 환불"),
            option("technical", "technical", "버그, 장애, 연동, API 오류"),
            option("sales", "sales", "가격, 업그레이드, 신규 계정"),
          ],
        },
      },
    },
    {
      id: "sentiment",
      type: "choice",
      name: "감정",
      drafts: {
        choice: {
          state: "마이그레이션은 완료됐지만 대시보드에 최근 2주 데이터가 없습니다.",
          question: "고객의 전반적인 감정은 무엇입니까?",
          options: [
            option("positive", "positive", "만족하며 주로 성공을 보고합니다."),
            option("mixed", "mixed", "긍정과 부정 신호가 비슷합니다."),
            option("negative", "negative", "불만, 실망 또는 차단 상태입니다."),
          ],
        },
      },
    },
    {
      id: "priority",
      type: "choice",
      name: "우선순위",
      drafts: {
        choice: {
          state: "프로덕션 결제가 모든 고객에게 중단되어 매출이 멈췄습니다.",
          question: "어느 우선순위를 지정해야 합니까?",
          options: [
            option("low", "low", "현재 영향이 없거나 우회 방법이 있습니다."),
            option("normal", "normal", "영향이 제한적이고 실용적인 우회 방법이 있습니다."),
            option("high", "high", "일부 사용자의 주요 워크플로가 차단되었습니다."),
            option("urgent", "urgent", "심각한 장애, 안전 문제 또는 매출 중단입니다."),
          ],
        },
      },
    },
  ],
  score: [
    {
      id: "lead-readiness",
      type: "score",
      name: "리드 준비도",
      drafts: {
        score: {
          state:
            "제목: 40석 가격 문의.\n지난달 두 팀에서 제품을 시험했고 엔지니어들은 표준 도입을 원합니다.",
          question: "이 리드는 구매 준비가 얼마나 되었습니까?",
          levels: [
            "0 · 둘러보는 중이며 명확한 니즈 없음",
            "1 · 평가 중이며 여러 대안을 비교함",
            "2 · 구매 준비 완료, 예산과 명확한 니즈 있음",
            "3 · 긴급하며 엄격한 마감과 도입 압력이 있음",
          ],
          threshold: 2,
        },
      },
    },
    {
      id: "answer-quality",
      type: "score",
      name: "답변 품질",
      drafts: {
        score: {
          state: "답변: 서비스를 재시작하세요. 아마 연결 문제가 해결될 것입니다.",
          question: "이 답변은 얼마나 실행 가능하고 신뢰할 수 있습니까?",
          levels: [
            "0 · 잘못되었거나 안전하지 않음",
            "1 · 모호하고 실용적 가치가 거의 없음",
            "2 · 그럴듯하지만 불완전함",
            "3 · 정확하고 실행 가능하며 작은 누락이 있음",
            "4 · 완전하고 구체적이며 검증 가능함",
          ],
          threshold: 3,
        },
      },
    },
    {
      id: "risk-level",
      type: "score",
      name: "위험 수준",
      drafts: {
        score: {
          state: "배포가 롤백 계획 없이 프로덕션 데이터베이스 스키마를 변경합니다.",
          question: "이 운영 위험은 얼마나 심각합니까?",
          levels: [
            "0 · 실질적인 위험 없음",
            "1 · 낮은 위험이며 쉽게 되돌릴 수 있음",
            "2 · 중간 위험이며 모니터링 필요",
            "3 · 높은 위험이며 서비스 영향 가능",
            "4 · 심각한 위험이며 데이터 손실 또는 장애 가능",
          ],
          threshold: 3,
        },
      },
    },
  ],
};
