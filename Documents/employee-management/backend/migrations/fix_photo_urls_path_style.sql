-- Исправление URL-ов фотографий в базе данных
-- Заменяем старые форматы URL на Path-style для REG.RU Cloud

-- Исправляем URL-ы с .website.regru.cloud
UPDATE task_photos 
SET photo_url = REPLACE(photo_url, '.website.regru.cloud', 's3.regru.cloud')
WHERE photo_url LIKE '%.website.regru.cloud%';

-- Исправляем URL-ы с .s3.regru.cloud (если есть)
UPDATE task_photos 
SET photo_url = REPLACE(photo_url, '.s3.regru.cloud', 's3.regru.cloud')
WHERE photo_url LIKE '%.s3.regru.cloud%';

-- Проверяем результат
SELECT COUNT(*) as updated_urls FROM task_photos WHERE photo_url LIKE '%s3.regru.cloud%'; 