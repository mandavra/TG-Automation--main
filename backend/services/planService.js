const Plan = require('../models/plan');

const createPlan = async (data) => {
  console.log("🔍 planService.createPlan: received data:", data);
  const plan = new Plan(data);
  return await plan.save();
};

const getAllPlans = async (filter = {}) => {
  return await Plan.find(filter);
};

const getPlanById = async (id, filter = {}) => {
  return await Plan.findOne({ _id: id, ...filter });
};

const updatePlan = async (id, data, filter = {}) => {
  return await Plan.findOneAndUpdate({ _id: id, ...filter }, data, { new: true });
};

const deletePlan = async (id, filter = {}) => {
  return await Plan.findOneAndDelete({ _id: id, ...filter });
};

const reorderPlans = async (orderedIds, filter = {}) => {
  for (let i = 0; i < orderedIds.length; i++) {
    await Plan.findOneAndUpdate({ _id: orderedIds[i], ...filter }, { order: i });
  }
  return true;
};

module.exports = {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  reorderPlans
};
