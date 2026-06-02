export default function EFTTerms() {
  return (
    <div className="pt-36 pb-32 bg-white min-h-screen">
      <div className="max-w-[820px] mx-auto px-[25px] text-gray-900">
        {/* 타이틀 */}
        <div className="mb-20">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            전자금융거래 기본약관
          </h1>
          <p className="text-gray-500 text-sm">
            최종 수정일자 : 2025-08-05 (Ver 1.0)
          </p>
        </div>

        {/* ================= 제1조 ================= */}
        <section className="mb-24">
          <div className="space-y-14 text-gray-700 leading-relaxed">
            <div>
              <h3 className="text-lg font-semibold mb-4">제1조 (목적)</h3>
              <p>
                이 약관은 (주)스마트로(이하 '회사'라 합니다)가 제공하는
                전자지급결제대행서비스 및 결제대금예치서비스를 이용자가 이용함에
                있어 회사와 이용자 사이의 전자금융거래에 관한 기본적인 사항을
                정함을 목적으로 합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">
                제2조 (용어의 정의)
              </h3>
              <p className="mb-4">
                ① 이 약관에서 정하는 용어의 정의는 다음 각 호와 같습니다.
              </p>

              <ol className="list-decimal ml-6 space-y-3">
                <li>전자금융거래의 정의</li>
                <li>전자지급수단의 정의</li>
                <li>전자지급결제대행서비스의 정의</li>
                <li>결제대금예치서비스의 정의</li>
                <li>이용자의 정의</li>
                <li>접근매체의 정의</li>
                <li>거래지시의 정의</li>
                <li>오류의 정의</li>
                <li>정보통신망의 정의</li>
              </ol>

              <p className="mt-4">
                ② 본 조 및 본 약관의 다른 조항에서 정의한 것을 제외하고는
                전자금융거래법 등 관계 법령에 따릅니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">
                제3조 (약관의 명시 및 변경)
              </h3>
              <p>
                회사는 이용자가 전자금융거래 서비스를 이용하기 전에 본 약관을
                게시하며, 변경 시 1개월 전에 공지합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">
                제4조 (전자지급결제대행서비스의 종류)
              </h3>
              <ol className="list-decimal ml-6 space-y-3">
                <li>신용카드결제대행서비스</li>
                <li>계좌이체대행서비스</li>
                <li>가상계좌서비스</li>
                <li>기타 휴대폰, ARS, 상품권 결제 등</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">
                제5조 (결제대금예치서비스의 내용)
              </h3>
              <p>
                이용자는 재화 등을 공급받은 날부터 3영업일 이내 회사에 통보해야
                하며, 회사는 약정된 기일 내 결제대금을 지급합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">제6조 (이용시간)</h3>
              <p>
                회사는 원칙적으로 연중무휴 24시간 서비스를 제공합니다. 다만
                시스템 점검 등 불가피한 경우 사전 공지 후 중단할 수 있습니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">
                제7조 (접근매체의 관리)
              </h3>
              <p>
                이용자는 접근매체를 제3자에게 양도, 대여, 담보 제공할 수 없으며
                도용 방지를 위해 충분한 주의를 기울여야 합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">
                제8조 (거래내용의 확인)
              </h3>
              <p>
                회사는 이용자가 거래내용을 확인할 수 있도록 제공하며, 요청 시
                2주 이내 서면을 교부합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">
                제9조 (오류의 정정)
              </h3>
              <p>
                이용자는 오류 발생 시 정정을 요구할 수 있으며, 회사는 조사 후
                2주 이내 결과를 통보합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">
                제10조 (회사의 책임)
              </h3>
              <p>
                접근매체 위조, 전송 사고 등으로 발생한 손해에 대해 회사는 배상
                책임을 부담합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">
                제15조 (분쟁처리 및 분쟁조정)
              </h3>
              <p>
                분쟁은 고객센터(1666-9114, cs@smartro.co.kr)를 통해 신청할 수
                있으며, 금융감독원 분쟁조정 절차를 이용할 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        {/* ================= 부칙 ================= */}
        <div className="border-t pt-10 text-sm text-gray-400">
          최초 시행일자 : 2025년 8월 1일
        </div>
      </div>
    </div>
  );
}
