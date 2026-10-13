const reportsService = require('./reports.service');

class ReportsController {
  async getCollections(req, res, next) {
    try {
      const result = await reportsService.getCollectionReport(req.query, req);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getOverdue(req, res, next) {
    try {
      const result = await reportsService.getOverdueReport(req.query, req);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getSales(req, res, next) {
    try {
      const result = await reportsService.getSalesPerformanceReport(req.query, req);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportsController();
