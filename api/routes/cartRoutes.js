import express from "express";

import { getCartByUser, addCartItem } from "../controllers/cartControllers.js";

const router = express.Router();

router.get("/cart", getCartByUser);

router.post("/addcart", addCartItem);

export default router;
