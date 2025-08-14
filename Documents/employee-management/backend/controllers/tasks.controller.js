const db = require('../db');
const telegram = require('../utils/telegram');
const { uploadFilesToS3 } = require('../utils/fileUpload');

const tasksController = {
    // Получение списка задач
    async getTasks(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            let query;
            const values = [req.user.company_id];

            if (req.user.role === 'manager') {
                // Менеджеры видят все задачи компании
                query = `
                    SELECT t.*, 
                           u.full_name as assigned_to_name,
                           u.username as assigned_to_username,
                           u.email as assigned_to_email,
                           c.full_name as created_by_name,
                           CASE 
                               WHEN t.status IN ('completed', 'needsRevision') THEN 
                                   json_build_object(
                                       'result', t.result,
                                       'completed_at', t.completed_at,
                                       'photos', COALESCE(
                                           (SELECT json_agg(tp.photo_url) 
                                            FROM task_photos tp 
                                            WHERE tp.task_id = t.id), 
                                           '[]'::json
                                       )
                                   )
                               ELSE NULL
                           END as completion_report
                    FROM tasks t
                    LEFT JOIN users u ON t.assigned_to = u.id
                    LEFT JOIN users c ON t.created_by = c.id
                    WHERE t.company_id = $1
                    ORDER BY t.created_at DESC
                `;
            } else {
                // Сотрудники видят только свои задачи
                query = `
                    SELECT t.*, 
                           u.full_name as assigned_to_name,
                           u.username as assigned_to_username,
                           u.email as assigned_to_email,
                           c.full_name as created_by_name,
                           CASE 
                               WHEN t.status IN ('completed', 'needsRevision') THEN 
                                   json_build_object(
                                       'result', t.result,
                                       'completed_at', t.completed_at,
                                       'photos', COALESCE(
                                           (SELECT json_agg(tp.photo_url) 
                                            FROM task_photos tp 
                                            WHERE tp.task_id = t.id), 
                                           '[]'::json
                                       )
                                   )
                               ELSE NULL
                           END as completion_report
                    FROM tasks t
                    LEFT JOIN users u ON t.assigned_to = u.id
                    LEFT JOIN users c ON t.created_by = c.id
                    WHERE t.company_id = $1 AND t.assigned_to = $2
                    ORDER BY t.created_at DESC
                `;
                values.push(req.user.id);
            }

            const { rows } = await db.query(query, values);
            
            // Исправляем URL-ы фотографий для старых записей
            const fixedRows = rows.map(row => {
                if (row.completion_report && row.completion_report.photos) {
                    row.completion_report.photos = row.completion_report.photos.map(photoUrl => {
                        // Заменяем старые форматы URL на Path-style
                        if (photoUrl.includes('.website.regru.cloud')) {
                            return photoUrl.replace('.website.regru.cloud', 's3.regru.cloud');
                        }
                        if (photoUrl.includes('.s3.regru.cloud')) {
                            return photoUrl.replace('.s3.regru.cloud', 's3.regru.cloud');
                        }
                        return photoUrl;
                    });
                }
                return row;
            });
            
            res.json(fixedRows);
        } catch (error) {
            console.error('Error getting tasks:', error);
            res.status(500).json({ message: 'Ошибка при получении задач' });
        }
    },

    // Получение назначенных и свободных задач для Telegram Mini App
    async getTasksForMiniApp(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            // Получаем назначенные задачи (статус assigned, accepted или in-progress)
            const assignedQuery = `
                SELECT t.*, 
                       u.full_name as assigned_to_name,
                       u.username as assigned_to_username,
                       u.email as assigned_to_email,
                       c.full_name as created_by_name,
                       comp.name as company_name,
                       comp.address as company_address
                FROM tasks t
                LEFT JOIN users u ON t.assigned_to = u.id
                LEFT JOIN users c ON t.created_by = c.id
                LEFT JOIN companies comp ON t.company_id = comp.id
                WHERE t.company_id = $1 AND t.assigned_to = $2 AND t.status IN ('assigned', 'accepted', 'in-progress')
                ORDER BY t.created_at DESC
            `;

            // Получаем свободные задачи (статус not-assigned)
            const freeQuery = `
                SELECT t.*, 
                       u.full_name as assigned_to_name,
                       u.username as assigned_to_username,
                       u.email as assigned_to_email,
                       c.full_name as created_by_name,
                       comp.name as company_name,
                       comp.address as company_address
                FROM tasks t
                LEFT JOIN users u ON t.assigned_to = u.id
                LEFT JOIN users c ON t.created_by = c.id
                LEFT JOIN companies comp ON t.company_id = comp.id
                WHERE t.company_id = $1 AND t.status = 'not-assigned'
                ORDER BY t.created_at DESC
            `;

            const [assignedResult, freeResult] = await Promise.all([
                db.query(assignedQuery, [req.user.company_id, req.user.id]),
                db.query(freeQuery, [req.user.company_id])
            ]);

            res.json({
                assigned: assignedResult.rows,
                free: freeResult.rows
            });
        } catch (error) {
            console.error('Error getting tasks for mini app:', error);
            res.status(500).json({ message: 'Ошибка при получении задач' });
        }
    },

    // Принятие задачи (для назначенных задач - меняем статус на accepted)
    async acceptAssignedTask(req, res) {
        try {
            const { id } = req.params;

            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            // Проверяем, что задача назначена текущему пользователю и имеет статус assigned
            const checkQuery = `
                SELECT * FROM tasks 
                WHERE id = $1 AND company_id = $2 AND assigned_to = $3 AND status = 'assigned'
            `;
            
            const checkResult = await db.query(checkQuery, [id, req.user.company_id, req.user.id]);
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ message: 'Задача не найдена или недоступна для принятия' });
            }

            // Обновляем статус на accepted
            const updateQuery = `
                UPDATE tasks 
                SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *, 
                    (SELECT full_name FROM users WHERE id = assigned_to) as assigned_to_name,
                    (SELECT username FROM users WHERE id = assigned_to) as assigned_to_username,
                    (SELECT email FROM users WHERE id = assigned_to) as assigned_to_email,
                    (SELECT full_name FROM users WHERE id = created_by) as created_by_name
            `;

            const { rows } = await db.query(updateQuery, [id]);
            res.json(rows[0]);
        } catch (error) {
            console.error('Error accepting assigned task:', error);
            res.status(500).json({ message: 'Ошибка при принятии задачи' });
        }
    },

    // Взятие свободной задачи (назначаем пользователю и меняем статус на accepted)
    async takeFreeTask(req, res) {
        try {
            const { id } = req.params;

            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            // Проверяем, что задача свободна и имеет статус not-assigned
            const checkQuery = `
                SELECT * FROM tasks 
                WHERE id = $1 AND company_id = $2 AND status = 'not-assigned'
            `;
            
            const checkResult = await db.query(checkQuery, [id, req.user.company_id]);
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ message: 'Задача не найдена или уже взята другим сотрудником' });
            }

            // Назначаем задачу пользователю и меняем статус на accepted
            const updateQuery = `
                UPDATE tasks 
                SET assigned_to = $1, status = 'accepted', updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND status = 'not-assigned'
                RETURNING *, 
                    (SELECT full_name FROM users WHERE id = assigned_to) as assigned_to_name,
                    (SELECT username FROM users WHERE id = assigned_to) as assigned_to_username,
                    (SELECT email FROM users WHERE id = assigned_to) as assigned_to_email,
                    (SELECT full_name FROM users WHERE id = created_by) as created_by_name
            `;

            const { rows } = await db.query(updateQuery, [req.user.id, id]);
            
            if (rows.length === 0) {
                return res.status(409).json({ message: 'Задача уже взята другим сотрудником' });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error('Error taking free task:', error);
            res.status(500).json({ message: 'Ошибка при взятии задачи' });
        }
    },

    // Получение задачи по ID
    async getTaskById(req, res) {
        try {
            const { id } = req.params;

            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            let query;
            const values = [id, req.user.company_id];

            if (req.user.role === 'manager') {
                query = `
                    SELECT t.*, 
                           u.full_name as assigned_to_name,
                           u.username as assigned_to_username,
                           u.email as assigned_to_email,
                           c.full_name as created_by_name,
                           CASE 
                               WHEN t.status IN ('completed', 'needsRevision') THEN 
                                   json_build_object(
                                       'result', t.result,
                                       'completed_at', t.completed_at,
                                       'photos', COALESCE(
                                           (SELECT json_agg(tp.photo_url) 
                                            FROM task_photos tp 
                                            WHERE tp.task_id = t.id), 
                                           '[]'::json
                                       )
                                   )
                               ELSE NULL
                           END as completion_report
                    FROM tasks t
                    LEFT JOIN users u ON t.assigned_to = u.id
                    LEFT JOIN users c ON t.created_by = c.id
                    WHERE t.id = $1 AND t.company_id = $2
                `;
            } else {
                query = `
                    SELECT t.*, 
                           u.full_name as assigned_to_name,
                           u.username as assigned_to_username,
                           u.email as assigned_to_email,
                           c.full_name as created_by_name,
                           CASE 
                               WHEN t.status IN ('completed', 'needsRevision') THEN 
                                   json_build_object(
                                       'result', t.result,
                                       'completed_at', t.completed_at,
                                       'photos', COALESCE(
                                           (SELECT json_agg(tp.photo_url) 
                                            FROM task_photos tp 
                                            WHERE tp.task_id = t.id), 
                                           '[]'::json
                                       )
                                   )
                               ELSE NULL
                           END as completion_report
                    FROM tasks t
                    LEFT JOIN users u ON t.assigned_to = u.id
                    LEFT JOIN users c ON t.created_by = c.id
                    WHERE t.id = $1 AND t.company_id = $2 AND t.assigned_to = $3
                `;
                values.push(req.user.id);
            }

            const { rows } = await db.query(query, values);

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Задача не найдена' });
            }

            // Исправляем URL-ы фотографий для старых записей
            const task = rows[0];
            if (task.completion_report && task.completion_report.photos) {
                task.completion_report.photos = task.completion_report.photos.map(photoUrl => {
                    // Заменяем старые форматы URL на Path-style
                    if (photoUrl.includes('.website.regru.cloud')) {
                        return photoUrl.replace('.website.regru.cloud', 's3.regru.cloud');
                    }
                    if (photoUrl.includes('.s3.regru.cloud')) {
                        return photoUrl.replace('.s3.regru.cloud', 's3.regru.cloud');
                    }
                    return photoUrl;
                });
            }

            res.json(task);
        } catch (error) {
            console.error('Error getting task:', error);
            res.status(500).json({ message: 'Ошибка при получении задачи' });
        }
    },

    // Создание новой задачи
    async createTask(req, res) {
        try {
            const { 
                title, 
                description, 
                assigned_to, 
                requires_verification = true, 
                address,
                start_point_latitude,
                start_point_longitude,
                finish_point_latitude,
                finish_point_longitude,
                expected_latitude,
                expected_longitude,
                expected_coordinates_source = 'manual',
                max_deviation_km = 5.0
            } = req.body;

            // Проверяем, что назначаемый сотрудник принадлежит той же компании
            if (assigned_to) {
                const { rows } = await db.query(
                    'SELECT id, telegram_id FROM users WHERE id = $1 AND company_id = $2',
                    [assigned_to, req.user.company_id]
                );
                if (rows.length === 0) {
                    return res.status(400).json({ message: 'Указанный сотрудник не найден' });
                }

                // Сохраняем chat_id для последующей отправки уведомления
                const assignedUserChatId = rows[0].telegram_id;
            }

            // Получаем company_id текущего пользователя
            const { rows: userRows } = await db.query(
                'SELECT company_id FROM users WHERE id = $1',
                [req.user.id]
            );

            if (userRows.length === 0 || !userRows[0].company_id) {
                return res.status(400).json({ message: 'Пользователь не привязан к компании' });
            }

            const company_id = userRows[0].company_id;

            const query = `
                INSERT INTO tasks (
                    title, description, status, company_id, 
                    assigned_to, created_by, requires_verification,
                    start_date, end_date, address,
                    start_point_latitude, start_point_longitude,
                    finish_point_latitude, finish_point_longitude,
                    expected_latitude, expected_longitude,
                    expected_coordinates_source, max_deviation_km
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                RETURNING *, 
                    (SELECT full_name FROM users WHERE id = assigned_to) as assigned_to_name,
                    (SELECT username FROM users WHERE id = assigned_to) as assigned_to_username,
                    (SELECT email FROM users WHERE id = assigned_to) as assigned_to_email,
                    (SELECT full_name FROM users WHERE id = created_by) as created_by_name
            `;

            const status = assigned_to ? 'assigned' : 'not-assigned';
            const values = [
                title,
                description,
                status,
                company_id,
                assigned_to,
                req.user.id,
                requires_verification,
                req.body.start_date,
                req.body.end_date,
                address,
                start_point_latitude,
                start_point_longitude,
                finish_point_latitude,
                finish_point_longitude,
                expected_latitude,
                expected_longitude,
                expected_coordinates_source,
                max_deviation_km
            ];

            const { rows } = await db.query(query, values);
            const createdTask = rows[0];

            // Отправляем уведомления
            try {
                if (status === 'assigned' && assigned_to) {
                    // Получаем chat_id назначенного пользователя
                    const { rows: userRows } = await db.query(
                        'SELECT telegram_id FROM users WHERE id = $1',
                        [assigned_to]
                    );
                    
                    if (userRows.length > 0 && userRows[0].telegram_id) {
                        await telegram.sendAssignedTaskNotification(userRows[0].telegram_id, createdTask);
                    }
                } else if (status === 'not-assigned') {
                    // Получаем chat_ids всех сотрудников компании, кроме менеджеров
                    const { rows: employeeRows } = await db.query(
                        'SELECT telegram_id FROM users WHERE company_id = $1 AND role != $2 AND telegram_id IS NOT NULL',
                        [company_id, 'manager']
                    );
                    
                    const chatIds = employeeRows.map(row => row.telegram_id).filter(Boolean);
                    if (chatIds.length > 0) {
                        await telegram.sendNotAssignedTaskNotification(chatIds, createdTask);
                    }
                }
            } catch (notificationError) {
                console.error('Error sending notifications:', notificationError);
                // Не прерываем выполнение, если уведомления не отправились
            }

            res.status(201).json(createdTask);
        } catch (error) {
            console.error('Error creating task:', error);
            res.status(500).json({ message: 'Ошибка при создании задачи' });
        }
    },

    // Обновление задачи
    async updateTask(req, res) {
        try {
            const { id } = req.params;
            const { 
                title, 
                description, 
                assigned_to, 
                requires_verification, 
                address,
                start_point_latitude,
                start_point_longitude,
                finish_point_latitude,
                finish_point_longitude,
                expected_latitude,
                expected_longitude,
                expected_coordinates_source,
                max_deviation_km
            } = req.body;

            // Проверяем существование задачи и права доступа
            const taskCheck = await db.query(
                'SELECT * FROM tasks WHERE id = $1 AND company_id = $2',
                [id, req.user.company_id]
            );

            if (taskCheck.rows.length === 0) {
                return res.status(404).json({ message: 'Задача не найдена' });
            }

            const oldTask = taskCheck.rows[0];

            // Проверяем, что назначаемый сотрудник принадлежит той же компании
            if (assigned_to) {
                const { rows } = await db.query(
                    'SELECT id FROM users WHERE id = $1 AND company_id = $2',
                    [assigned_to, req.user.company_id]
                );
                if (rows.length === 0) {
                    return res.status(400).json({ message: 'Указанный сотрудник не найден' });
                }
            }

            const query = `
                UPDATE tasks 
                SET title = COALESCE($1, title),
                    description = COALESCE($2, description),
                    assigned_to = COALESCE($3, assigned_to),
                    requires_verification = COALESCE($4, requires_verification),
                    start_date = COALESCE($5, start_date),
                    end_date = COALESCE($6, end_date),
                    address = COALESCE($7, address),
                    start_point_latitude = COALESCE($8, start_point_latitude),
                    start_point_longitude = COALESCE($9, start_point_longitude),
                    finish_point_latitude = COALESCE($10, finish_point_latitude),
                    finish_point_longitude = COALESCE($11, finish_point_longitude),
                    expected_latitude = COALESCE($12, expected_latitude),
                    expected_longitude = COALESCE($13, expected_longitude),
                    expected_coordinates_source = COALESCE($14, expected_coordinates_source),
                    max_deviation_km = COALESCE($15, max_deviation_km),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $16 AND company_id = $17
                RETURNING *, 
                    (SELECT full_name FROM users WHERE id = assigned_to) as assigned_to_name,
                    (SELECT username FROM users WHERE id = assigned_to) as assigned_to_username,
                    (SELECT email FROM users WHERE id = assigned_to) as assigned_to_email,
                    (SELECT full_name FROM users WHERE id = created_by) as created_by_name
            `;

            const values = [
                title,
                description,
                assigned_to,
                requires_verification,
                req.body.start_date,
                req.body.end_date,
                address,
                start_point_latitude,
                start_point_longitude,
                finish_point_latitude,
                finish_point_longitude,
                expected_latitude,
                expected_longitude,
                expected_coordinates_source,
                max_deviation_km,
                id,
                req.user.company_id
            ];

            const { rows } = await db.query(query, values);
            const updatedTask = rows[0];

            // Отправляем уведомления об изменении задачи
            try {
                await tasksController.sendTaskUpdateNotifications(oldTask, updatedTask, req.body);
            } catch (notificationError) {
                console.error('Error sending task update notifications:', notificationError);
                // Не прерываем выполнение, если уведомления не отправились
            }

            res.json(updatedTask);
        } catch (error) {
            console.error('Error updating task:', error);
            res.status(500).json({ message: 'Ошибка при обновлении задачи' });
        }
    },

    // Метод для отправки уведомлений об изменении задачи
    async sendTaskUpdateNotifications(oldTask, updatedTask, changes) {
        console.log('🔔 sendTaskUpdateNotifications called');
        console.log('📋 Task status:', updatedTask.status);
        console.log('👤 Task assigned_to:', updatedTask.assigned_to);
        console.log('📝 Changes:', changes);
        console.log('📋 Old task:', {
            title: oldTask.title,
            description: oldTask.description,
            start_date: oldTask.start_date,
            end_date: oldTask.end_date,
            requires_verification: oldTask.requires_verification,
            address: oldTask.address,
            assigned_to: oldTask.assigned_to,
            status: oldTask.status
        });
        console.log('📋 Updated task:', {
            title: updatedTask.title,
            description: updatedTask.description,
            start_date: updatedTask.start_date,
            end_date: updatedTask.end_date,
            requires_verification: updatedTask.requires_verification,
            address: updatedTask.address,
            assigned_to: updatedTask.assigned_to,
            status: updatedTask.status
        });
        
        // Функция для нормализации дат для сравнения
        const normalizeDate = (date) => {
            if (!date) return null;
            const normalized = new Date(date).toISOString().split('T')[0]; // YYYY-MM-DD
            console.log('🔍 normalizeDate:', { input: date, output: normalized });
            return normalized;
        };
        
        // Определяем, какие поля изменились
        const actualChanges = {};
        
        console.log('🔍 Comparing title:', { new: changes.title, old: oldTask.title, changed: changes.title !== undefined && changes.title !== oldTask.title });
        if (changes.title !== undefined && changes.title !== oldTask.title) actualChanges.title = changes.title;
        
        console.log('🔍 Comparing description:', { new: changes.description, old: oldTask.description, changed: changes.description !== undefined && changes.description !== oldTask.description });
        if (changes.description !== undefined && changes.description !== oldTask.description) actualChanges.description = changes.description;
        
        console.log('🔍 Comparing start_date:', { 
            new: changes.start_date, 
            old: oldTask.start_date, 
            newNormalized: normalizeDate(changes.start_date),
            oldNormalized: normalizeDate(oldTask.start_date),
            changed: changes.start_date !== undefined && normalizeDate(changes.start_date) !== normalizeDate(oldTask.start_date) 
        });
        if (changes.start_date !== undefined && normalizeDate(changes.start_date) !== normalizeDate(oldTask.start_date)) actualChanges.start_date = changes.start_date;
        
        console.log('🔍 Comparing end_date:', { 
            new: changes.end_date, 
            old: oldTask.end_date, 
            newNormalized: normalizeDate(changes.end_date),
            oldNormalized: normalizeDate(oldTask.end_date),
            changed: changes.end_date !== undefined && normalizeDate(changes.end_date) !== normalizeDate(oldTask.end_date) 
        });
        if (changes.end_date !== undefined && normalizeDate(changes.end_date) !== normalizeDate(oldTask.end_date)) actualChanges.end_date = changes.end_date;
        
        // Убираем requires_verification из уведомлений - это внутренняя логика
        // console.log('🔍 Comparing requires_verification:', { new: changes.requires_verification, old: oldTask.requires_verification, changed: changes.requires_verification !== undefined && changes.requires_verification !== oldTask.requires_verification });
        // if (changes.requires_verification !== undefined && changes.requires_verification !== oldTask.requires_verification) {
        //     actualChanges.requires_verification = changes.requires_verification;
        // }
        
        console.log('🔍 Comparing address:', { new: changes.address, old: oldTask.address, changed: changes.address !== undefined && changes.address !== oldTask.address });
        if (changes.address !== undefined && changes.address !== oldTask.address) {
            actualChanges.address = changes.address;
        }
        
        console.log('🔍 Comparing assigned_to:', { new: changes.assigned_to, old: oldTask.assigned_to, changed: changes.assigned_to !== undefined && changes.assigned_to !== oldTask.assigned_to });
        if (changes.assigned_to !== undefined && changes.assigned_to !== oldTask.assigned_to) {
            actualChanges.assigned_to = changes.assigned_to;
        }
        
        console.log('🔍 Comparing status:', { new: changes.status, old: oldTask.status, changed: changes.status !== undefined && changes.status !== oldTask.status });
        if (changes.status !== undefined && changes.status !== oldTask.status) {
            actualChanges.status = changes.status;
        }

        console.log('🔄 Actual changes detected:', actualChanges);

        // Если нет изменений, не отправляем уведомления
        if (Object.keys(actualChanges).length === 0) {
            console.log('❌ No actual changes detected, skipping notification');
            return;
        }

        // Определяем список пользователей для уведомлений
        const usersToNotify = [];

        // Если изменился назначенный пользователь
        if (actualChanges.assigned_to !== undefined) {
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
        } else {
            // Если назначенный пользователь не изменился, уведомляем только текущего
            if (updatedTask.assigned_to && updatedTask.status !== 'not-assigned') {
                usersToNotify.push({
                    userId: updatedTask.assigned_to,
                    type: 'current'
                });
            }
        }

        console.log('📱 Users to notify:', usersToNotify);

        // Отправляем уведомления всем пользователям
        for (const userInfo of usersToNotify) {
            try {
                // Получаем telegram_id пользователя
                const { rows } = await db.query(
                    'SELECT telegram_id FROM users WHERE id = $1',
                    [userInfo.userId]
                );

                if (rows.length > 0 && rows[0].telegram_id) {
                    console.log(`📤 Sending notification to user ${userInfo.userId} (${userInfo.type}) with telegram_id:`, rows[0].telegram_id);
                    
                    // Отправляем уведомления в зависимости от типа
                    if (userInfo.type === 'removed') {
                        // Отправляем специальное уведомление о снятии с задачи
                        await telegram.sendTaskRemovedNotification(
                            rows[0].telegram_id,
                            updatedTask
                        );
                    } else if (userInfo.type === 'assigned' && Object.keys(actualChanges).length === 1 && actualChanges.assigned_to) {
                        // Отправляем уведомление как о новой задаче
                        await telegram.sendAssignedTaskNotification(
                            rows[0].telegram_id,
                            updatedTask
                        );
                    } else {
                        // Отправляем обычное уведомление об изменениях
                        await telegram.sendTaskUpdateNotification(
                            rows[0].telegram_id,
                            updatedTask,
                            actualChanges
                        );
                    }
                    console.log(`✅ Notification sent successfully to user ${userInfo.userId}`);
                } else {
                    console.log(`❌ No telegram_id found for user: ${userInfo.userId}`);
                }
            } catch (error) {
                console.error(`❌ Error sending notification to user ${userInfo.userId}:`, error);
            }
        }
    },

    // Удаление задачи
    async deleteTask(req, res) {
        try {
            const { id } = req.params;

            // Проверяем существование задачи и права доступа
            const result = await db.query(
                'DELETE FROM tasks WHERE id = $1 AND company_id = $2 RETURNING id',
                [id, req.user.company_id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Задача не найдена' });
            }

            res.json({ message: 'Задача успешно удалена' });
        } catch (error) {
            console.error('Error deleting task:', error);
            res.status(500).json({ message: 'Ошибка при удалении задачи' });
        }
    },

    // Обновление статуса задачи
    async updateTaskStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            // Проверяем валидность статуса
            const validStatuses = ['assigned', 'accepted', 'in-progress', 'completed', 'done', 'cancelled', 'needsRevision'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Недопустимый статус' });
            }

            let query;
            let values;

            if (req.user.role === 'manager') {
                query = `
                    UPDATE tasks 
                    SET status = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2 AND company_id = $3
                    RETURNING *, 
                        (SELECT full_name FROM users WHERE id = assigned_to) as assigned_to_name,
                        (SELECT username FROM users WHERE id = assigned_to) as assigned_to_username,
                        (SELECT email FROM users WHERE id = assigned_to) as assigned_to_email,
                        (SELECT full_name FROM users WHERE id = created_by) as created_by_name,
                        CASE 
                            WHEN $1 IN ('completed', 'needsRevision') THEN 
                                json_build_object(
                                    'result', result,
                                    'completed_at', completed_at,
                                    'photos', COALESCE(
                                        (SELECT json_agg(tp.photo_url) 
                                         FROM task_photos tp 
                                         WHERE tp.task_id = id), 
                                        '[]'::json
                                    )
                                )
                            ELSE NULL
                        END as completion_report
                `;
                values = [status, id, req.user.company_id];
            } else {
                query = `
                    UPDATE tasks 
                    SET status = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2 AND company_id = $3 AND assigned_to = $4
                    RETURNING *, 
                        (SELECT full_name FROM users WHERE id = assigned_to) as assigned_to_name,
                        (SELECT username FROM users WHERE id = assigned_to) as assigned_to_username,
                        (SELECT email FROM users WHERE id = assigned_to) as assigned_to_email,
                        (SELECT full_name FROM users WHERE id = created_by) as created_by_name,
                        CASE 
                            WHEN $1 IN ('completed', 'needsRevision') THEN 
                                json_build_object(
                                    'result', result,
                                    'completed_at', completed_at,
                                    'photos', COALESCE(
                                        (SELECT json_agg(tp.photo_url) 
                                         FROM task_photos tp 
                                         WHERE tp.task_id = id), 
                                        '[]'::json
                                    )
                                )
                            ELSE NULL
                        END as completion_report
                `;
                values = [status, id, req.user.company_id, req.user.id];
            }

            const { rows } = await db.query(query, values);

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Задача не найдена или нет прав для её обновления' });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error('Error updating task status:', error);
            res.status(500).json({ message: 'Ошибка при обновлении статуса задачи' });
        }
    },

    // Начало работы над задачей с проверкой локации
    async startWork(req, res) {
        try {
            const { id } = req.params;

            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            // Проверяем, что у пользователя есть активная сессия (делится локацией)
            const sessionQuery = `
                SELECT id, user_id, task_id, start_time, end_time, is_active
                FROM sessions 
                WHERE user_id = $1 AND is_active = true
                ORDER BY start_time DESC
                LIMIT 1
            `;
            
            const sessionResult = await db.query(sessionQuery, [req.user.id]);
            
            if (sessionResult.rows.length === 0) {
                return res.status(400).json({ 
                    message: 'Для начала работы необходимо делиться локацией',
                    requiresLocation: true
                });
            }

            // Проверяем, что задача существует и назначена пользователю
            const taskQuery = `
                SELECT id, title, status, assigned_to, company_id
                FROM tasks 
                WHERE id = $1 AND company_id = $2 AND assigned_to = $3
            `;
            
            const taskResult = await db.query(taskQuery, [id, req.user.company_id, req.user.id]);
            
            if (taskResult.rows.length === 0) {
                return res.status(404).json({ message: 'Задача не найдена или нет прав для её обновления' });
            }

            const task = taskResult.rows[0];
            
            // Проверяем, что статус задачи позволяет начать работу
            if (task.status !== 'accepted') {
                return res.status(400).json({ message: 'Можно начать работу только с принятой задачи' });
            }

            // Получаем текущую позицию пользователя для установки точки старта
            const positionQuery = `
                SELECT latitude, longitude
                FROM positions 
                WHERE user_id = $1 
                ORDER BY timestamp DESC 
                LIMIT 1
            `;
            
            const positionResult = await db.query(positionQuery, [req.user.id]);
            let startPointLatitude = null;
            let startPointLongitude = null;
            
            if (positionResult.rows.length > 0) {
                startPointLatitude = positionResult.rows[0].latitude;
                startPointLongitude = positionResult.rows[0].longitude;
                console.log(`📍 Setting start point for task ${id}: ${startPointLatitude}, ${startPointLongitude}`);
            } else {
                console.log(`⚠️ No position data found for user ${req.user.id}, start point will be null`);
            }

            // Начинаем транзакцию
            const client = await db.connect();
            try {
                await client.query('BEGIN');

                // Обновляем статус задачи на 'in-progress' и устанавливаем точку старта
                const updateQuery = `
                    UPDATE tasks 
                    SET status = 'in-progress', 
                        start_point_latitude = COALESCE($2, start_point_latitude),
                        start_point_longitude = COALESCE($3, start_point_longitude),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    RETURNING *, 
                        (SELECT full_name FROM users WHERE id = assigned_to) as assigned_to_name,
                        (SELECT username FROM users WHERE id = assigned_to) as assigned_to_username,
                        (SELECT email FROM users WHERE id = assigned_to) as assigned_to_email,
                        (SELECT full_name FROM users WHERE id = created_by) as created_by_name
                `;
                
                const updateResult = await client.query(updateQuery, [id, startPointLatitude, startPointLongitude]);

                // Завершаем предыдущую активную сессию (если она была привязана к другой задаче)
                const session = sessionResult.rows[0];
                if (session.task_id && session.task_id !== parseInt(id)) {
                    const endPreviousSessionQuery = `
                        UPDATE sessions 
                        SET end_time = CURRENT_TIMESTAMP, is_active = false, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $1
                        RETURNING id
                    `;
                    await client.query(endPreviousSessionQuery, [session.id]);
                    console.log(`🏁 Ended previous session ${session.id} for task ${session.task_id}`);
                }

                // Создаем новую сессию для текущей задачи
                const createNewSessionQuery = `
                    INSERT INTO sessions (user_id, task_id, start_time, is_active)
                    VALUES ($1, $2, CURRENT_TIMESTAMP, true)
                    RETURNING id, user_id, task_id, start_time, is_active
                `;
                
                const newSessionResult = await client.query(createNewSessionQuery, [req.user.id, id]);
                console.log(`✅ Created new session ${newSessionResult.rows[0].id} for task ${id}`);

                await client.query('COMMIT');

                res.json(updateResult.rows[0]);
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Error starting work:', error);
            res.status(500).json({ message: 'Ошибка при начале работы над задачей' });
        }
    },

    // Завершение задачи с результатом и фотографиями
    async completeTask(req, res) {
        try {
            const { id } = req.params;
            const { result, status } = req.body;
            const photos = req.files || [];

            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            if (!result || !result.trim()) {
                return res.status(400).json({ message: 'Результат выполнения обязателен' });
            }

            // Проверяем, что задача существует и назначена пользователю
            const taskQuery = `
                SELECT id, title, status, assigned_to, company_id, requires_verification
                FROM tasks 
                WHERE id = $1 AND company_id = $2 AND assigned_to = $3
            `;
            
            const taskResult = await db.query(taskQuery, [id, req.user.company_id, req.user.id]);
            
            if (taskResult.rows.length === 0) {
                return res.status(404).json({ message: 'Задача не найдена или нет прав для её обновления' });
            }

            const task = taskResult.rows[0];
            
            // Проверяем, что статус задачи позволяет завершить работу
            if (task.status !== 'in-progress') {
                return res.status(400).json({ message: 'Можно завершить только задачу в работе' });
            }

            // Определяем новый статус
            let newStatus = status;
            if (!newStatus) {
                newStatus = task.requires_verification ? 'needsRevision' : 'done';
            }

            // Начинаем транзакцию
            const client = await db.connect();
            try {
                await client.query('BEGIN');

                // Обновляем статус задачи и добавляем результат
                const updateQuery = `
                    UPDATE tasks 
                    SET status = $1, 
                        result = $2,
                        completed_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $3
                    RETURNING *, 
                        (SELECT full_name FROM users WHERE id = assigned_to) as assigned_to_name,
                        (SELECT username FROM users WHERE id = assigned_to) as assigned_to_username,
                        (SELECT email FROM users WHERE id = assigned_to) as assigned_to_email,
                        (SELECT full_name FROM users WHERE id = created_by) as created_by_name
                `;
                
                const updateResult = await client.query(updateQuery, [newStatus, result, id]);

                // Завершаем активную сессию для этой задачи
                const endSessionQuery = `
                    UPDATE sessions 
                    SET end_time = CURRENT_TIMESTAMP, is_active = false, updated_at = CURRENT_TIMESTAMP
                    WHERE task_id = $1 AND user_id = $2 AND is_active = true
                    RETURNING id
                `;
                
                const sessionResult = await client.query(endSessionQuery, [id, req.user.id]);
                console.log(`🏁 Ended ${sessionResult.rows.length} sessions for completed task ${id}`);

                // Загружаем фотографии в S3 (если есть)
                if (photos.length > 0) {
                    const photoUrls = await uploadFilesToS3(photos, id);
                    
                    const photoInsertQuery = `
                        INSERT INTO task_photos (task_id, photo_url, created_at)
                        VALUES ($1, $2, CURRENT_TIMESTAMP)
                    `;
                    
                    for (const photoUrl of photoUrls) {
                        await client.query(photoInsertQuery, [id, photoUrl]);
                    }
                }

                await client.query('COMMIT');

                res.json(updateResult.rows[0]);
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Error completing task:', error);
            res.status(500).json({ message: 'Ошибка при завершении задачи' });
        }
    }
};

module.exports = tasksController; 