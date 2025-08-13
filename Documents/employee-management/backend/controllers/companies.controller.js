const db = require('../db');

const createCompany = async (req, res) => {
  const {
    name,
    inn,
    address,
    work_start_time,
    work_end_time,
    lunch_break_start,
    lunch_break_end,
    comment
  } = req.body;

  try {
    // Check if user is a manager
    const userResult = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!userResult.rows[0] || userResult.rows[0].role !== 'manager') {
      return res.status(403).json({ message: 'Only managers can create companies' });
    }

    // Create company
    const result = await db.query(
      `INSERT INTO companies (
        name, inn, address, work_start_time, work_end_time,
        lunch_break_start, lunch_break_end, comment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, inn, address, work_start_time, work_end_time,
       lunch_break_start, lunch_break_end, comment]
    );

    // Update user's company_id and onboarding status
    await db.query(
      'UPDATE users SET company_id = $1, onboarding_completed = true WHERE id = $2',
      [result.rows[0].id, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating company:', err);
    res.status(500).json({ message: 'Server error while creating company' });
  }
};

const getCompanyById = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM companies WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching company:', err);
    res.status(500).json({ message: 'Server error while fetching company' });
  }
};

const updateCompany = async (req, res) => {
  const {
    name,
    inn,
    address,
    work_start_time,
    work_end_time,
    lunch_break_start,
    lunch_break_end,
    comment
  } = req.body;

  try {
    // Check if user is a manager
    const userResult = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!userResult.rows[0] || userResult.rows[0].role !== 'manager') {
      return res.status(403).json({ message: 'Only managers can update companies' });
    }

    const result = await db.query(
      `UPDATE companies SET 
        name = $1, inn = $2, address = $3, work_start_time = $4, 
        work_end_time = $5, lunch_break_start = $6, lunch_break_end = $7, 
        comment = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [name, inn, address, work_start_time, work_end_time,
       lunch_break_start, lunch_break_end, comment, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ message: 'Server error while updating company' });
  }
};

module.exports = {
  createCompany,
  getCompanyById,
  updateCompany
}; 