export default function ServiceGuide() {
  return (
    <div className="pt-36 pb-32 bg-white min-h-screen">
      <div className="max-w-[820px] mx-auto px-[25px] text-gray-900">
        {/* 타이틀 */}
        <div className="mb-20">
          <h1 className="text-5xl font-bold tracking-tight mb-6">이용안내</h1>
          <p className="text-gray-500 text-sm">
            Pupoo 서비스 이용 절차 및 주요 안내사항
          </p>
        </div>

        {/* ================= 1. 회원가입 ================= */}
        <section className="mb-24">
          <h2 className="text-2xl font-semibold mb-12 tracking-tight">
            1. 회원가입 및 로그인
          </h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              Pupoo 서비스는 소셜 로그인을 통해 간편하게 가입할 수 있습니다.
              네이버, 카카오, 구글, 애플 계정을 이용하여 별도의 회원정보 입력
              없이 빠르게 가입이 가능합니다.
            </p>
            <p>
              가입 완료 후에는 마이페이지에서 기본 정보 수정, 관심 행사 설정,
              알림 수신 설정 등을 관리할 수 있습니다.
            </p>
            <p>
              만 14세 미만의 이용자는 가입이 제한될 수 있으며, 일부 서비스는
              본인인증 또는 성인인증이 필요할 수 있습니다.
            </p>
          </div>
        </section>

        {/* ================= 2. 행사 신청 ================= */}
        <section className="mb-24">
          <h2 className="text-2xl font-semibold mb-12 tracking-tight">
            2. 행사 참가 신청 및 결제
          </h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              메인 페이지 또는 행사 목록에서 현재 진행 중이거나 예정된 행사를
              확인할 수 있습니다.
            </p>
            <p>
              원하는 행사를 선택한 후 참가 신청 버튼을 클릭하면 상세 안내, 일정,
              프로그램 구성, 참가비 등의 정보를 확인할 수 있습니다.
            </p>
            <p>
              참가 신청 후 결제 단계에서는 신용카드, 계좌이체, 가상계좌 등
              다양한 결제수단을 이용할 수 있으며, 결제가 완료되면 신청이
              확정됩니다.
            </p>
            <p>
              신청 내역은 마이페이지 &gt; 참가 신청 내역에서 언제든지 확인할 수
              있습니다.
            </p>
          </div>
        </section>

        {/* ================= 3. QR 체크인 ================= */}
        <section className="mb-24">
          <h2 className="text-2xl font-semibold mb-12 tracking-tight">
            3. QR 체크인 및 현장 이용
          </h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              행사 당일에는 마이페이지 또는 문자/이메일로 발송된 QR코드를 통해
              빠른 입장이 가능합니다.
            </p>
            <p>
              현장 스태프가 QR코드를 스캔하여 참가 확인을 진행하며, 별도의 종이
              티켓 없이 간편하게 체크인할 수 있습니다.
            </p>
            <p>
              일부 프로그램, 체험존, 콘테스트 등은 별도의 현장 등록 또는 사전
              예약이 필요할 수 있습니다.
            </p>
          </div>
        </section>

        {/* ================= 4. 환불 및 변경 ================= */}
        <section className="mb-24">
          <h2 className="text-2xl font-semibold mb-12 tracking-tight">
            4. 취소 및 환불 안내
          </h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>행사 취소 및 환불은 각 행사별 환불 정책에 따라 처리됩니다.</p>
            <p>
              환불 신청은 마이페이지 &gt; 참가 신청 내역에서 직접 신청할 수
              있으며, 행사 일정에 따라 일부 수수료가 발생할 수 있습니다.
            </p>
            <p>
              결제 수단에 따라 환불 처리 기간이 상이할 수 있으며, 카드 결제의
              경우 카드사 승인 취소까지 영업일 기준 수일이 소요될 수 있습니다.
            </p>
          </div>
        </section>

        {/* ================= 5. 고객센터 ================= */}
        <section className="mb-24">
          <h2 className="text-2xl font-semibold mb-12 tracking-tight">
            5. 고객센터 및 문의
          </h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              서비스 이용 중 불편사항, 결제 오류, 환불 문의 등은 고객센터를 통해
              접수하실 수 있습니다.
            </p>
            <p>
              문의 접수 후 순차적으로 확인하여 답변드리며, 처리 결과는 등록된
              이메일 또는 연락처로 안내됩니다.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
