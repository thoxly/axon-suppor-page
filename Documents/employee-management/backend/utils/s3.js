const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config');

// Создаем S3 клиент для REG.RU Cloud
const s3Client = new S3Client({
    credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
    },
    endpoint: config.s3.endpoint,
    forcePathStyle: false, // Используем virtual-hosted-style для REG.RU
});

const s3Service = {
    // Загрузка файла в S3
    async uploadFile(file, taskId, filename) {
        try {
            const key = `tasks/${taskId}/${filename}`;
            
            const uploadParams = {
                Bucket: config.s3.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read', // Делаем файл публично доступным
                Metadata: {
                    'original-name': file.originalname,
                    'uploaded-by': taskId,
                    'upload-date': new Date().toISOString()
                }
            };

            const command = new PutObjectCommand(uploadParams);
            await s3Client.send(command);

            // Возвращаем публичный URL файла
            // Используем Path-style ссылки для REG.RU Cloud
            return `https://s3.regru.cloud/${config.s3.bucketName}/${key}`;
        } catch (error) {
            console.error('Error uploading file to S3:', error);
            throw new Error('Ошибка загрузки файла в облако');
        }
    },

    // Удаление файла из S3
    async deleteFile(fileUrl) {
        try {
            // Извлекаем ключ из URL
            const url = new URL(fileUrl);
            const key = url.pathname.substring(1); // Убираем первый слеш

            const deleteParams = {
                Bucket: config.s3.bucketName,
                Key: key
            };

            const command = new DeleteObjectCommand(deleteParams);
            await s3Client.send(command);
            
            return true;
        } catch (error) {
            console.error('Error deleting file from S3:', error);
            return false;
        }
    },

    // Получение временной ссылки для загрузки (если нужна)
    async getSignedUploadUrl(taskId, filename, contentType) {
        try {
            const key = `tasks/${taskId}/${filename}`;
            
            const command = new PutObjectCommand({
                Bucket: config.s3.bucketName,
                Key: key,
                ContentType: contentType,
                ACL: 'public-read'
            });

            const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 час
            return signedUrl;
        } catch (error) {
            console.error('Error generating signed URL:', error);
            throw new Error('Ошибка генерации ссылки для загрузки');
        }
    },

    // Проверка существования файла
    async fileExists(fileUrl) {
        try {
            const url = new URL(fileUrl);
            const key = url.pathname.substring(1);

            const command = new GetObjectCommand({
                Bucket: config.s3.bucketName,
                Key: key
            });

            await s3Client.send(command);
            return true;
        } catch (error) {
            if (error.name === 'NoSuchKey') {
                return false;
            }
            throw error;
        }
    },

    // Генерация уникального имени файла
    generateFileName(originalName) {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const ext = originalName.split('.').pop();
        return `photo-${timestamp}-${random}.${ext}`;
    },

    // Исправление URL для Path-style ссылок
    fixPhotoUrl(photoUrl) {
        if (photoUrl.includes('.website.regru.cloud')) {
            return photoUrl.replace('.website.regru.cloud', 's3.regru.cloud');
        }
        if (photoUrl.includes('.s3.regru.cloud')) {
            return photoUrl.replace('.s3.regru.cloud', 's3.regru.cloud');
        }
        return photoUrl;
    }
};

module.exports = s3Service; 