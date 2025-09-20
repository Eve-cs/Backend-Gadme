// controllers/ordersHistoryController.js
import mongoose from "mongoose";
import { Order } from "../../models/Order.js";

/**
 * GET /orderhistory/my
 * Query:
 *  - limit (number, default 10, max 50)
 *  - page  (number, default 1)
 *  - status (optional: pending|paid|shipped|delivered|cancelled|... ตาม enum คุณ)
 *  - from, to (optional ISO date/string ที่ new Date() แปลงได้)
 *  - sort (optional: createdAt_desc [default] | createdAt_asc)
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // pagination
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const page = Math.max(Number(req.query.page) || 1, 1);

    // base filter
    const filter = { user_id: userId };

    // status filter (optional)
    const { status } = req.query;
    if (status && typeof status === "string") {
      filter.order_status = status;
    }

    // date range filter (optional)
    const { from, to } = req.query;
    if (from || to) {
      const range = {};
      if (from) {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) range.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) range.$lte = d;
      }
      if (Object.keys(range).length) {
        filter.createdAt = range;
      }
    }

    // sort
    const { sort } = req.query;
    const sortMap = {
      createdAt_desc: { createdAt: -1 },
      createdAt_asc: { createdAt: 1 },
    };
    const sortSpec = sortMap[sort] || sortMap.createdAt_desc;

    // query + count in parallel
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return res.json({ orders, total, page, limit });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /orderhistory/:orderId
 * คืนรายละเอียดออเดอร์ของผู้ใช้ปัจจุบันเท่านั้น
 */
export const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findOne({
      _id: orderId,
      user_id: req.user._id,
    }).lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json(order);
  } catch (err) {
    next(err);
  }
};
