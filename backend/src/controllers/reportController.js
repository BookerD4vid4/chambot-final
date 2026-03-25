const svc = require("../services/reportService");

const handle = (fn) => async (req, res, next) => {
    try {
        const data = await fn(req);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/reports/sales?startDate=&endDate=&groupBy=day|month
exports.sales = handle(async (req) =>
    svc.getSalesReport(svc.parseRange(req.query))
);

// GET /api/admin/reports/products?startDate=&endDate=
exports.products = handle(async (req) =>
    svc.getProductReport(svc.parseRange(req.query))
);

// GET /api/admin/reports/inventory
exports.inventory = handle(async () =>
    svc.getInventoryReport()
);

// GET /api/admin/reports/customers?startDate=&endDate=
exports.customers = handle(async (req) =>
    svc.getCustomerReport(svc.parseRange(req.query))
);

// GET /api/admin/reports/financial?startDate=&endDate=
exports.financial = handle(async (req) =>
    svc.getFinancialSummary(svc.parseRange(req.query))
);
