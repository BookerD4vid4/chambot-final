const repo = require("../repositories/reportRepository");

const parseRange = (query) => ({
    startDate: query.startDate || null,
    endDate: query.endDate || null,
    groupBy: query.groupBy || "day",
});

const getSalesReport = async (filters) => repo.getSalesReport(filters);
const getProductReport = async (filters) => repo.getProductReport(filters);
const getInventoryReport = async () => repo.getInventoryReport();
const getCustomerReport = async (filters) => repo.getCustomerReport(filters);
const getFinancialSummary = async (filters) => repo.getFinancialSummary(filters);

module.exports = { getSalesReport, getProductReport, getInventoryReport, getCustomerReport, getFinancialSummary, parseRange };
