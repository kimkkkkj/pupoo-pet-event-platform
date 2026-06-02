export default function PrivacyPolicy() {
  return (
    <div className="pt-36 pb-32 bg-white min-h-screen">
      <div className="max-w-[820px] mx-auto px-[25px] text-gray-900">
        {/* 타이틀 */}
        <div className="mb-20">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            개인정보처리방침
          </h1>
          <p className="text-gray-500 text-sm">작성일자 : 2025년 10월 24일</p>
        </div>

        {/* ================= 제1장 ================= */}
        <section className="mb-24">
          <h2 className="text-2xl font-semibold mb-12 tracking-tight">
            제1장 개인정보의 처리 목적, 수집 항목 및 보유기간
          </h2>

          <div className="space-y-14 text-gray-700 leading-relaxed">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                ① 개인정보 수집 및 이용 목적
              </h3>
              <p>
                회사는 회원가입, 서비스 제공, 주문 및 결제 처리, 고객 상담,
                마케팅 안내 등의 목적을 위해 개인정보를 수집·이용합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">② 수집 항목</h3>

              <ol className="list-decimal ml-6 space-y-3">
                <li>
                  회원가입 : 이름, 아이디, 비밀번호, 이메일, 휴대폰번호, 성별,
                  생년월일, 주소
                </li>
                <li>주문/결제 : 주문자정보, 배송지정보, 결제정보</li>
                <li>이벤트 참여 : 이름, 연락처, 주소</li>
                <li>
                  자동 수집 항목 : IP주소, 쿠키, 단말정보(Device ID), 서비스
                  이용기록
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">③ 보유 및 이용기간</h3>
              <p>
                원칙적으로 개인정보는 수집·이용 목적 달성 시 즉시 파기합니다.
                단, 관계 법령에 따라 일정 기간 보관할 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        {/* ================= 제2장 ================= */}
        <section className="mb-24">
          <h2 className="text-2xl font-semibold mb-12 tracking-tight">
            제2장 개인정보의 제공 및 위탁
          </h2>

          <div className="space-y-14 text-gray-700 leading-relaxed">
            <div>
              <h3 className="text-lg font-semibold mb-4">① 제3자 제공</h3>
              <p>
                회사는 이용자의 동의가 있거나 법령에 근거한 경우에만 개인정보를
                제3자에게 제공합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">② 업무 위탁</h3>
              <p>
                회사는 원활한 서비스 제공을 위해 일부 업무를 외부 업체에 위탁할
                수 있으며, 위탁 시 개인정보 보호 관련 법령을 준수하도록
                관리·감독합니다.
              </p>
            </div>
          </div>
        </section>

        {/* ================= 제3장 ================= */}
        <section className="mb-24">
          <h2 className="text-2xl font-semibold mb-12 tracking-tight">
            제3장 보유기간 및 파기
          </h2>

          <div className="space-y-14 text-gray-700 leading-relaxed">
            <div>
              <h3 className="text-lg font-semibold mb-4">① 파기 시점</h3>
              <p>
                개인정보 보유기간이 경과하거나 처리 목적이 달성된 경우 지체 없이
                파기합니다.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">② 파기 방법</h3>
              <p>
                전자적 파일은 복구 불가능한 방식으로 삭제하며, 종이 문서는 분쇄
                또는 소각 처리합니다.
              </p>
            </div>
          </div>
        </section>

        {/* ================= 제4장 ================= */}
        <section className="mb-24">
          <h2 className="text-2xl font-semibold mb-12 tracking-tight">
            제4장 이용자의 권리 및 행사방법
          </h2>

          <div className="space-y-14 text-gray-700 leading-relaxed">
            <p>
              이용자는 개인정보 열람, 정정, 삭제, 처리정지 및 동의철회를 요청할
              수 있으며, 고객센터 또는 홈페이지를 통해 행사할 수 있습니다.
            </p>
          </div>
        </section>

        {/* ================= 제5장 ================= */}
        <section className="mb-24">
          <h2 className="text-2xl font-semibold mb-12 tracking-tight">
            제5장 자동수집 장치의 설치 및 거부
          </h2>

          <div className="space-y-14 text-gray-700 leading-relaxed">
            <p>
              회사는 쿠키(cookie)를 사용하여 맞춤형 서비스를 제공합니다.
              이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.
            </p>
          </div>
        </section>

        {/* ================= 제6장 ================= */}
        <section className="mb-24">
          <h2 className="text-2xl font-semibold mb-12 tracking-tight">
            제6장 안전성 확보조치
          </h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>1. 관리적 조치 : 내부관리계획 수립 및 직원 교육</p>
            <p>2. 기술적 조치 : 접근권한 관리 및 암호화</p>
            <p>3. 물리적 조치 : 전산실 접근통제</p>
          </div>
        </section>

        {/* ================= 제7장 ================= */}
        <section className="mb-24">
          <h2 className="text-2xl font-semibold mb-12 tracking-tight">
            제7장 개인정보보호 책임자
          </h2>

          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>개인정보보호책임자 : 이상현</p>
            <p>이메일 : info@kfv.kr</p>
            <p>개인정보보호담당자 : 문지우</p>
            <p>이메일 : info@kfv.kr</p>
          </div>
        </section>

        {/* ================= 제8장 ================= */}
        <section className="mb-24">
          <h2 className="text-2xl font-semibold mb-12 tracking-tight">
            제8장 처리방침의 개정
          </h2>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              본 개인정보처리방침은 관련 법령 또는 내부 정책 변경에 따라 개정될
              수 있으며, 변경 시 홈페이지를 통해 공지합니다.
            </p>
          </div>
        </section>

        {/* ================= 부칙 ================= */}
        <div className="border-t pt-10 text-sm text-gray-400">
          시행일자 : 2025년 10월 24일
        </div>
      </div>
    </div>
  );
}
