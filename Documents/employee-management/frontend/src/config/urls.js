// Конфигурация URL'ов для разных окружений
export const API_URLS = {
    local: 'http://localhost:3003',
    tunnel: 'https://operates-stops-eu-fallen.trycloudflare.com',
};

export const FRONTEND_URLS = {
    local: 'http://localhost:3002',
    tunnel: 'https://2adbc769f69a.ngrok.app',
};

// URL логотипа в S3
export const LOGO_URL = 'https://s3.regru.cloud/arrive-fr-reports/web-content/logo_arrive.svg';
export const LOGO_DARK_MODE_URL = 'https://s3.regru.cloud/arrive-fr-reports/web-content/logo_arrive_dm.svg';

// Функция для простого обновления URL'ов
export const updateTunnelUrls = (newBackendUrl, newFrontendUrl) => {
    if (newBackendUrl) {
        API_URLS.tunnel = newBackendUrl;
    }
    if (newFrontendUrl) {
        FRONTEND_URLS.tunnel = newFrontendUrl;
    }
}; 