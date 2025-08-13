// Тестовый скрипт для проверки логики сравнения дат

const normalizeDate = (date) => {
    if (!date) return null;
    const normalized = new Date(date).toISOString().split('T')[0]; // YYYY-MM-DD
    console.log('🔍 normalizeDate:', { input: date, output: normalized });
    return normalized;
};

// Тестовые данные
const oldTask = {
    start_date: '2025-08-12T00:00:00.000Z',
    end_date: '2025-08-14T00:00:00.000Z'
};

const changes = {
    address: 'Деревня Кут',
    start_date: '2025-08-12T00:00:00.000Z',
    end_date: '2025-08-14T00:00:00.000Z'
};

console.log('=== ТЕСТ СРАВНЕНИЯ ДАТ ===');
console.log('Old task:', oldTask);
console.log('Changes:', changes);

// Проверяем сравнение дат
console.log('\n🔍 Comparing start_date:');
const startDateChanged = changes.start_date !== undefined && normalizeDate(changes.start_date) !== normalizeDate(oldTask.start_date);
console.log('Start date changed:', startDateChanged);

console.log('\n🔍 Comparing end_date:');
const endDateChanged = changes.end_date !== undefined && normalizeDate(changes.end_date) !== normalizeDate(oldTask.end_date);
console.log('End date changed:', endDateChanged);

console.log('\n🔍 Comparing address:');
const addressChanged = changes.address !== undefined && changes.address !== oldTask.address;
console.log('Address changed:', addressChanged);

// Создаем объект actualChanges
const actualChanges = {};
if (startDateChanged) actualChanges.start_date = changes.start_date;
if (endDateChanged) actualChanges.end_date = changes.end_date;
if (addressChanged) actualChanges.address = changes.address;

console.log('\n🔄 Actual changes detected:', actualChanges);
console.log('Expected: only address should be in actualChanges'); 