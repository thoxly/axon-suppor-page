// Тестовый скрипт для проверки логики уведомлений

console.log('=== ТЕСТ ЛОГИКИ УВЕДОМЛЕНИЙ ===');

// Симуляция данных
const oldTask = {
    id: 1,
    title: 'Старая задача',
    description: 'Описание старой задачи',
    assigned_to: 2, // Старый пользователь
    address: 'Старый адрес'
};

const updatedTask = {
    id: 1,
    title: 'Новая задача',
    description: 'Описание новой задачи',
    assigned_to: 3, // Новый пользователь
    address: 'Новый адрес'
};

const changes = {
    title: 'Новая задача',
    description: 'Описание новой задачи',
    assigned_to: 3,
    address: 'Новый адрес'
};

console.log('Old task:', oldTask);
console.log('Updated task:', updatedTask);
console.log('Changes:', changes);

// Симуляция логики определения пользователей для уведомлений
const usersToNotify = [];

// Если изменился назначенный пользователь
if (changes.assigned_to !== undefined) {
    console.log('👥 Assignment changed, will notify both old and new users');
    
    // Добавляем старого пользователя (если он был)
    if (oldTask.assigned_to) {
        usersToNotify.push({
            userId: oldTask.assigned_to,
            type: 'removed'
        });
    }
    
    // Добавляем нового пользователя (если он есть)
    if (updatedTask.assigned_to) {
        usersToNotify.push({
            userId: updatedTask.assigned_to,
            type: 'assigned'
        });
    }
}

console.log('📱 Users to notify:', usersToNotify);

// Симуляция отправки уведомлений
for (const userInfo of usersToNotify) {
    console.log(`\n--- Уведомление для пользователя ${userInfo.userId} (${userInfo.type}) ---`);
    
    // Создаем копию изменений для этого пользователя
    const userChanges = { ...changes };
    
    if (userInfo.type === 'removed') {
        console.log('❌ Пользователь снят с задачи');
        console.log('📝 Тип уведомления: sendTaskRemovedNotification (специальное уведомление о снятии)');
    } else if (userInfo.type === 'assigned') {
        console.log('✅ Пользователь назначен на задачу');
        
        // Проверяем, нужно ли отправлять как новую задачу
        if (Object.keys(userChanges).length === 1 && userChanges.assigned_to) {
            console.log('📝 Тип уведомления: sendAssignedTaskNotification (новая задача)');
        } else {
            console.log('📝 Тип уведомления: sendTaskUpdateNotification (с кнопкой)');
        }
    }
} 