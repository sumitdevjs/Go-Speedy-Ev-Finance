const penaltiesService = require('./penalties.service');

class PenaltiesController {
  async create(req, res, next) {
    try {
      const result = await penaltiesService.createPenalty(req.body, req.user);
      res.status(201).json({
        success: true,
        message: `Penalty of ₹${req.body.amount} added successfully`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const result = await penaltiesService.getPenalties(req.query, req);
      res.status(200).json({
        success: true,
        data: result.data,
        summary: result.summary
      });
    } catch (err) {
      next(err);
    }
  }

  async waive(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const result = await penaltiesService.waivePenalty(id, req.user, reason);
      res.status(200).json({
        success: true,
        message: 'Penalty waived successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getTenantPenalties(req, res, next) {
    try {
      const { tenantId } = req.params;
      const result = await penaltiesService.getTenantActivePenalties(tenantId);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PenaltiesController();
