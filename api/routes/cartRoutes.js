import express from "express";
import { authUser } from "../../middleware/auth.js";

import {
  getCartByUser,
  addCartItem,
  countCartByUser,
  deleteCart,
  productQty,
  deleteCartById,
  getCartMetaHandler,
} from "../controllers/cartControllers.js";

const router = express.Router();

router.get("/cart", authUser, getCartByUser);

router.post("/cart", authUser, addCartItem);

router.delete("/cart", authUser, deleteCart);

router.get("/cart/count", authUser, countCartByUser);

router.put("/cart/:itemId", authUser, productQty);

router.delete("/cart/:itemId", authUser, deleteCartById);

router.get("/cart/meta", authUser, getCartMetaHandler);

export default router;
