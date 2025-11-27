-- 롯데칠성 요청사항 반영 SQL

-- =====================================================
-- 상품 업데이트 쿼리
-- =====================================================

-- 1. 생수 가격 3,400원 + 3+1 미적용
UPDATE products
SET price = 3400, is_pepsi_family = false
WHERE name LIKE '%생수%' OR category = 'WATER';

-- 2. 텍스트 수정 + 잔치집 식혜 이미지 변경
UPDATE products
SET name = '잔치집 식혜 340ml×24캔',
    image = 'https://shop-phinf.pstatic.net/20250203_282/173854631575463mFJ_JPEG/85511570544907356_359695488.jpg?type=m1000_pd'
WHERE name LIKE '%잔치집%식혜%';
UPDATE products SET name = '탐스제로파인애플 355ml×24캔' WHERE name LIKE '%탐스%파인애플%';
UPDATE products SET name = '탐스제로사과 355ml×24캔' WHERE name LIKE '%탐스%사과%';
UPDATE products SET name = '탐스쥬시오렌지 355ml×24캔' WHERE name LIKE '%탐스%오렌지%';
UPDATE products SET name = '탐스쥬시포도 355ml×24캔' WHERE name LIKE '%탐스%포도%';

-- 3. 칠성사이다 제로 500펫 이미지 변경
UPDATE products
SET image = 'https://shop-phinf.pstatic.net/20251117_15/1763346717719KFG6Q_JPEG/80353211539300711_517772847.jpg?type=m1000_pd'
WHERE name LIKE '%칠성사이다%제로%500%';

-- 4. 펩시 500펫 이미지 변경
UPDATE products
SET image = 'https://shop-phinf.pstatic.net/20250510_286/1746860998668pdM2J_JPEG/68178335665255156_1472784829.jpg?type=m1000_pd'
WHERE name LIKE '%펩시%500%' AND name NOT LIKE '%제로%';

-- =====================================================
-- 월별 무료 박스 사용량 테이블 생성
-- =====================================================

-- 사업자번호별 월별 무료 박스 사용량 추적 테이블
CREATE TABLE IF NOT EXISTS monthly_service_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_number VARCHAR(12) NOT NULL,      -- 사업자번호 (XXX-XX-XXXXX)
  year_month VARCHAR(7) NOT NULL,            -- "2025-01" 형식
  used_boxes INT DEFAULT 0,                  -- 사용한 무료 박스 수
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_number, year_month)
);

-- RLS 정책 설정 (모든 인증된 사용자가 조회/삽입/수정 가능)
ALTER TABLE monthly_service_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON monthly_service_usage
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON monthly_service_usage
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON monthly_service_usage
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 확인용 쿼리
SELECT id, name, price, is_pepsi_family, image FROM products ORDER BY name;

