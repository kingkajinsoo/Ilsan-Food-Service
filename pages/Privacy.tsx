import React from 'react';
import { Link } from 'react-router-dom';

const Privacy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-4">개인정보처리방침</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <p className="mb-4">
              <strong>주식회사 아는마케팅</strong>(이하 "회사")은 이용자의 개인정보를 중요시하며, 
              「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 
              관련 법령을 준수하고 있습니다.
            </p>
            <p>
              회사는 개인정보처리방침을 통하여 이용자가 제공하는 개인정보가 어떠한 용도와 방식으로 
              이용되고 있으며, 개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. 개인정보의 수집 항목 및 수집 방법</h2>
            <div className="ml-4">
              <h3 className="font-semibold mb-2">가. 수집 항목</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>필수 항목:</strong> 이메일, 이름, 상호명(업소명), 사업자등록번호, 연락처, 배송지 주소</li>
                <li><strong>자동 수집 항목:</strong> 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보</li>
              </ul>
              <h3 className="font-semibold mt-4 mb-2">나. 수집 방법</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>카카오 소셜 로그인을 통한 회원가입 및 서비스 이용 과정에서 수집</li>
                <li>주문 및 배송 정보 입력 시 수집</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. 개인정보의 수집 및 이용 목적</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>회원 가입 및 관리, 본인 확인</li>
              <li>상품 주문 및 배송 서비스 제공</li>
              <li>주문 내역 관리 및 고객 문의 응대</li>
              <li>서비스 개선 및 신규 서비스 개발</li>
              <li>마케팅 및 광고 활용 (이벤트, 프로모션 안내 등)</li>
              <li>통계 분석 및 서비스 이용 현황 파악</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. 개인정보의 보유 및 이용 기간</h2>
            <p className="mb-2">
              회사는 원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 
              단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.
            </p>
            <div className="ml-4">
              <h3 className="font-semibold mb-2">가. 회사 내부 방침에 의한 정보 보유</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>회원 탈퇴 시까지 보관 (탈퇴 즉시 파기)</li>
              </ul>
              <h3 className="font-semibold mt-4 mb-2">나. 관련 법령에 의한 정보 보유</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
                <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
                <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
                <li>표시/광고에 관한 기록: 6개월 (전자상거래법)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. 개인정보의 제3자 제공</h2>
            <p className="mb-2">
              회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 
              다만, 아래의 경우에는 예외로 합니다.
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
              <li>배송 업무를 위해 배송업체에 필요 최소한의 정보(수령인명, 주소, 연락처)를 제공하는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. 개인정보 처리의 위탁</h2>
            <p>
              회사는 서비스 향상을 위해 개인정보 처리 업무를 외부 전문업체에 위탁할 수 있습니다. 
              위탁 시에는 관련 법령에 따라 안전하게 관리되도록 필요한 사항을 규정하고 관리·감독합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. 이용자의 권리와 행사 방법</h2>
            <p className="mb-2">이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>개인정보 열람 요구</li>
              <li>개인정보 정정 요구</li>
              <li>개인정보 삭제 요구</li>
              <li>개인정보 처리 정지 요구</li>
            </ul>
            <p className="mt-2">
              권리 행사는 서비스 내 "마이페이지"를 통해 직접 하실 수 있으며, 
              개인정보보호책임자에게 서면, 전화, 이메일 등으로 연락하시면 지체 없이 조치하겠습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. 개인정보의 파기 절차 및 방법</h2>
            <p className="mb-2">
              회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 
              지체 없이 해당 개인정보를 파기합니다.
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li><strong>전자적 파일:</strong> 복구 및 재생이 불가능한 기술적 방법으로 완전 삭제</li>
              <li><strong>종이 문서:</strong> 분쇄기로 분쇄하거나 소각</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. 개인정보 보호책임자</h2>
            <p className="mb-2">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 
              개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="bg-gray-50 p-4 rounded border">
              <p><strong>개인정보 보호책임자</strong></p>
              <ul className="mt-2 space-y-1">
                <li>성명: 전미란</li>
                <li>소속: 주식회사 아는마케팅</li>
                <li>이메일: anenmaketing25@gmail.com</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. 개인정보의 안전성 확보 조치</h2>
            <p className="mb-2">회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>개인정보 취급 직원의 최소화 및 교육</li>
              <li>개인정보에 대한 접근 제한</li>
              <li>개인정보를 안전하게 저장·전송할 수 있는 암호화 기술 적용</li>
              <li>해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위한 보안 프로그램 설치</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. 개인정보처리방침의 변경</h2>
            <p>
              이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는
              변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

          <section className="bg-blue-50 p-4 rounded border border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-3">사업자 정보</h2>
            <ul className="space-y-1">
              <li><strong>상호:</strong> 주식회사 아는마케팅</li>
              <li><strong>대표자:</strong> 전미란</li>
              <li><strong>사업자등록번호:</strong> 765-86-03336</li>
              <li><strong>주소:</strong> 경기도 고양시 덕양구 권율대로 656, 16층 6호 일부 (원흥동, 클래시아 더퍼스트)</li>
              <li><strong>이메일:</strong> anenmaketing25@gmail.com</li>
            </ul>
          </section>

          <section className="text-center mt-8">
            <p className="text-sm text-gray-500">시행일자: 2025년 11월 26일</p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
