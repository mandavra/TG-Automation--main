const planService = require('../services/planService');

const addPlan = async (req, res) => {
  try {
    const planData = req.setAdminOwnership(req.body);
    const plan = await planService.createPlan(planData);
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPlans = async (req, res) => {
  try {
    // Check if tenant filter is available (admin request) or use empty filter (public request)
    const filter = req.getTenantFilter ? req.getTenantFilter() : {};
    const plans = await planService.getAllPlans(filter);
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSinglePlan = async (req, res) => {
  try {
    // Check if tenant filter is available (admin request) or use empty filter (public request)
    const filter = req.getTenantFilter ? req.getTenantFilter() : {};
    const plan = await planService.getPlanById(req.params.id, filter);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const editPlan = async (req, res) => {
  try {
    const filter = req.getTenantFilter();
    const updatedPlan = await planService.updatePlan(req.params.id, req.body, filter);
    if (!updatedPlan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    res.json(updatedPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePlan = async (req, res) => {
  try {
    const filter = req.getTenantFilter();
    const deleted = await planService.deletePlan(req.params.id, filter);
    if (!deleted) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    res.json({ message: 'Plan deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reorderPlans = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    const filter = req.getTenantFilter();
    await planService.reorderPlans(orderedIds, filter);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addPlan,
  getPlans,
  getSinglePlan,
  editPlan,
  deletePlan,
  reorderPlans
};
