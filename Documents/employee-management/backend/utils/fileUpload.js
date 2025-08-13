const multer = require('multer');
const s3Service = require('./s3');

// Настройка хранилища для multer с памятью (для S3)
const storage = multer.memoryStorage();

// Фильтр файлов
const fileFilter = (req, file, cb) => {
  // Разрешаем только изображения
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения'), false);
  }
};

// Настройка multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB максимум
    files: 10 // максимум 10 файлов
  }
});

// Middleware для загрузки фотографий задач
const uploadTaskPhotos = upload.array('photos', 10);

// Функция для загрузки файлов в S3 и получения URL
const uploadFilesToS3 = async (files, taskId) => {
  const uploadedUrls = [];
  
  for (const file of files) {
    const filename = s3Service.generateFileName(file.originalname);
    const fileUrl = await s3Service.uploadFile(file, taskId, filename);
    uploadedUrls.push(fileUrl);
  }
  
  return uploadedUrls;
};

// Функция для удаления файла из S3
const deleteFileFromS3 = async (fileUrl) => {
  return await s3Service.deleteFile(fileUrl);
};

// Функция для получения URL файла (для обратной совместимости)
const getFileUrl = (taskId, filename) => {
  return `https://s3.regru.cloud/${require('../config').s3.bucketName}/tasks/${taskId}/${filename}`;
};

module.exports = {
  uploadTaskPhotos,
  uploadFilesToS3,
  deleteFileFromS3,
  getFileUrl,
  s3Service
}; 