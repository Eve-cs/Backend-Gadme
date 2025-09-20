import express from "express";
import { authUser } from "../../middleware/auth.js";
import {
  getMyOrders,
  getOrderById,
} from "../controllers/ordersHistoryController.js";

const router = express.Router();

router.get("/orderhistory/my", authUser, getMyOrders);
router.get("/orderhistory/my/:orderId", authUser, getOrderById);

export default router;
