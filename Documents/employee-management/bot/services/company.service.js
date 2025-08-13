const db = require('../db');

class CompanyService {
    /**
     * Получить компанию по ID
     * @param {number} companyId - ID компании
     * @returns {Promise<Object|null>} - Данные компании или null
     */
    async getCompanyById(companyId) {
        try {
            const query = `
                SELECT id, name, inn, address, work_start_time, work_end_time, 
                       lunch_break_start, lunch_break_end, comment
                FROM companies 
                WHERE id = $1
            `;
            
            const result = await db.query(query, [companyId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('❌ Error in getCompanyById:', error);
            throw error;
        }
    }

    /**
     * Получить список всех компаний
     * @returns {Promise<Array>} - Массив компаний
     */
    async getAllCompanies() {
        try {
            const query = `
                SELECT id, name, inn, address, created_at
                FROM companies 
                ORDER BY name
            `;
            
            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            console.error('❌ Error in getAllCompanies:', error);
            throw error;
        }
    }

    /**
     * Получить количество сотрудников в компании
     * @param {number} companyId - ID компании
     * @returns {Promise<number>} - Количество сотрудников
     */
    async getCompanyEmployeesCount(companyId) {
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM users 
                WHERE company_id = $1
            `;
            
            const result = await db.query(query, [companyId]);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('❌ Error in getCompanyEmployeesCount:', error);
            throw error;
        }
    }
}

module.exports = new CompanyService(); 