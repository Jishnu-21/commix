const Report = require('../models/Report');
const { validationResult } = require('express-validator');

// Add a new report
exports.addReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, product_id, reason } = req.body;

    const report = new Report({
      user_id,
      product_id,
      reason
    });

    await report.save();
    res.status(201).json({ message: 'Report added successfully', report });
  } catch (error) {
    console.error('Error adding report:', error);
    res.status(500).json({ message: 'Server error while adding report' });
  }
};

// Admin change report status
exports.changeReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = status;
    await report.save();

    res.json({ message: 'Report status updated successfully', report });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ message: 'Server error while updating report status' });
  }
};