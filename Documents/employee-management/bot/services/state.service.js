const db = require('../db');

class StateService {
    // Get current state for user
    async getUserState(telegramId) {
        const stateQuery = `
            SELECT state, data
            FROM fsm_states
            WHERE telegram_id = $1
        `;
        const result = await db.query(stateQuery, [telegramId]);
        return result.rows[0] || null;
    }

    // Set state for user
    async setState(telegramId, state, data = {}) {
        const query = `
            INSERT INTO fsm_states (telegram_id, state, data)
            VALUES ($1, $2, $3)
            ON CONFLICT (telegram_id)
            DO UPDATE SET 
                state = $2,
                data = $3,
                updated_at = CURRENT_TIMESTAMP
            RETURNING state, data
        `;
        const result = await db.query(query, [telegramId, state, data]);
        return result.rows[0];
    }

    // Clear state for user
    async clearState(telegramId) {
        const query = `
            DELETE FROM fsm_states
            WHERE telegram_id = $1
        `;
        await db.query(query, [telegramId]);
    }

    // Update state data
    async updateStateData(telegramId, data) {
        const query = `
            UPDATE fsm_states
            SET data = data || $2::jsonb,
                updated_at = CURRENT_TIMESTAMP
            WHERE telegram_id = $1
            RETURNING state, data
        `;
        const result = await db.query(query, [telegramId, data]);
        return result.rows[0];
    }
}

module.exports = new StateService(); 
