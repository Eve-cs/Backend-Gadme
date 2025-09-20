import express from "express";
import { authUser } from "../../middleware/auth.js";
import {
  getCheckoutCart,
  createOrderFromCart,
  getOrderById,
  updateOrderPayment,
} from "../controllers/ordersController.js";

const router = express.Router();

router.get("/orders/cart", authUser, getCheckoutCart);
router.post("/orders", authUser, createOrderFromCart);
router.get("/orders/:orderId", authUser, getOrderById);
router.patch("/orders/:orderId/payment", authUser, updateOrderPayment);

export default router;
