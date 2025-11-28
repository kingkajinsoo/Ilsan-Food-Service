import React from 'react';
import { Link } from 'react-router-dom';

const Terms: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-4">이용약관</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제1조 (목적)</h2>
            <p>
              본 약관은 주식회사 아는마케팅(이하 "회사")이 운영하는 
              한국외식업중앙회 경기도북부지회 고양시일산서구지부 주문 포털(이하 "서비스")의 
              이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제2조 (정의)</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>
                <strong>"서비스"</strong>란 회사가 제공하는 업소용 음료 주문 및 관련 서비스를 의미합니다.
              </li>
              <li>
                <strong>"회원"</strong>이란 본 약관에 동의하고 카카오 소셜 로그인을 통해 회원가입을 완료한 자로서, 
                회사가 제공하는 서비스를 이용할 수 있는 자를 말합니다.
              </li>
              <li>
                <strong>"주문"</strong>이란 회원이 서비스를 통해 상품을 선택하고 구매 의사를 표시하는 행위를 말합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                본 약관은 서비스를 이용하고자 하는 모든 회원에게 그 효력이 발생합니다.
              </li>
              <li>
                회사는 필요한 경우 관련 법령을 위배하지 않는 범위 내에서 본 약관을 변경할 수 있으며, 
                약관이 변경되는 경우 변경사항을 시행일자 7일 전부터 공지합니다.
              </li>
              <li>
                회원이 변경된 약관에 동의하지 않는 경우, 서비스 이용을 중단하고 회원 탈퇴를 할 수 있습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제4조 (회원가입)</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                회원가입은 카카오 소셜 로그인을 통해서만 가능합니다.
              </li>
              <li>
                회원은 회원가입 시 본 약관 및 개인정보처리방침에 동의해야 하며, 
                동의하지 않을 경우 서비스를 이용할 수 없습니다.
              </li>
              <li>
                회원은 정확하고 최신의 정보를 제공해야 하며, 허위 정보 제공 시 서비스 이용이 제한될 수 있습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제5조 (회원의 의무)</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                회원은 본 약관 및 관련 법령을 준수해야 합니다.
              </li>
              <li>
                회원은 타인의 정보를 도용하거나 부정한 방법으로 서비스를 이용해서는 안 됩니다.
              </li>
              <li>
                회원은 회사의 사전 승낙 없이 서비스를 이용하여 영업 활동을 할 수 없으며, 
                그 영업 활동의 결과에 대해 회사는 책임을 지지 않습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제6조 (서비스의 제공 및 변경)</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                회사는 다음과 같은 서비스를 제공합니다:
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>업소용 음료 주문 서비스</li>
                  <li>3+1 프로모션 혜택 제공</li>
                  <li>앞치마 자동 신청 서비스 (최초 주문 시)</li>
                  <li>주문 내역 관리 및 배송지 관리</li>
                </ul>
              </li>
              <li>
                회사는 상당한 이유가 있는 경우 운영상, 기술상의 필요에 따라 제공하고 있는 서비스를 변경할 수 있습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제7조 (서비스의 중단)</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                회사는 다음 각 호에 해당하는 경우 서비스 제공을 일시적으로 중단할 수 있습니다:
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>시스템 정기점검, 증설 및 교체를 위해 필요한 경우</li>
                  <li>천재지변, 국가비상사태 등 불가항력적 사유가 있는 경우</li>
                  <li>기타 서비스 제공에 지장이 있는 경우</li>
                </ul>
              </li>
              <li>
                회사는 서비스 중단으로 인해 발생한 손해에 대해서는 회사의 고의 또는 중과실이 없는 한 책임을 지지 않습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제8조 (주문 및 결제)</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                회원은 서비스를 통해 상품을 주문할 수 있으며, 주문 시 정확한 배송지 정보를 입력해야 합니다.
              </li>
              <li>
                3+1 프로모션은 주문 목록에 펩시 제품이 1박스 이상 포함된 경우에만 적용되며,
                신규(롯데칠성음료 고양지점 첫 거래) 1개 사업자당 월 최대 10박스까지 한정기간동안 무료 혜택이 제공됩니다.
              </li>
              <li>
                앞치마 자동 신청은 1개 사업자 기준 최초 주문 1회에 한해 5장이 자동으로 신청됩니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제9조 (배송 및 반품)</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                배송은 회원이 지정한 배송지로 이루어지며, 배송 기간은 주문 확정 후 영업일 기준 3~7일 소요됩니다.
              </li>
              <li>
                상품의 하자 또는 오배송의 경우, 회원은 배송 완료일로부터 7일 이내에 회사에 연락하여 교환 또는 환불을 요청할 수 있습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제10조 (회원 탈퇴 및 자격 상실)</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                회원은 언제든지 회사에 탈퇴를 요청할 수 있으며, 회사는 즉시 회원 탈퇴를 처리합니다.
              </li>
              <li>
                회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원 자격을 제한 또는 정지시킬 수 있습니다:
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>가입 신청 시 허위 내용을 등록한 경우</li>
                  <li>다른 사람의 서비스 이용을 방해하거나 정보를 도용하는 경우</li>
                  <li>서비스를 이용하여 법령 또는 본 약관이 금지하는 행위를 하는 경우</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제11조 (면책조항)</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인해
                서비스를 제공할 수 없는 경우 책임이 면제됩니다.
              </li>
              <li>
                회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.
              </li>
              <li>
                회사는 회원이 서비스를 이용하여 기대하는 수익을 얻지 못하거나
                상실한 것에 대하여 책임을 지지 않습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제12조 (분쟁 해결)</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>
                회사와 회원 간 발생한 분쟁에 관한 소송은 민사소송법상의 관할법원에 제기합니다.
              </li>
              <li>
                본 약관에 명시되지 않은 사항은 관련 법령 및 상관례에 따릅니다.
              </li>
            </ol>
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

export default Terms;
