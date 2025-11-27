-- 롯데칠성 요청사항 반영 SQL

-- 1. 생수 가격 3,400원 + 3+1 미적용
UPDATE products 
SET price = 3400, is_pepsi_family = false 
WHERE name LIKE '%생수%' OR category = 'WATER';

-- 2. 텍스트 수정
UPDATE products SET name = '잔치집 식혜 340ml×24캔' WHERE name LIKE '%잔치집%식혜%';
UPDATE products SET name = '탐스제로파인애플 355ml×24캔' WHERE name LIKE '%탐스%파인애플%';
UPDATE products SET name = '탐스제로사과 355ml×24캔' WHERE name LIKE '%탐스%사과%';
UPDATE products SET name = '탐스쥬시오렌지 355ml×24캔' WHERE name LIKE '%탐스%오렌지%';
UPDATE products SET name = '탐스쥬시포도 355ml×24캔' WHERE name LIKE '%탐스%포도%';

-- 3. 칠성사이다 제로 500펫 이미지 변경
UPDATE products 
SET image = '/사이다 제로 업소용.png' 
WHERE name LIKE '%칠성사이다%제로%500%';

-- 4. 펩시 500펫 이미지 변경
UPDATE products 
SET image = '/펩시 업소용.png' 
WHERE name LIKE '%펩시%500%' AND name NOT LIKE '%제로%';

-- 확인용 쿼리
SELECT id, name, price, is_pepsi_family, image FROM products ORDER BY name;

