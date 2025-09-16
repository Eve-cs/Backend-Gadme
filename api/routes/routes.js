import express from "express";
import addressRoutes from "./addressRoutes.js";

import productUserRoutes from "./productUserRoutes.js";
import cartRoutes from "./cartRoutes.js";
import productRoutes from "./productRoutes.js";

import userRoutes from "./userRoutes.js";
import orderConfirmRouters from "./orderConfirmRoutes.js";
import orderRoutes from "./orderRoutes.js";

// import { authUser } from "../../middleware/auth.js"

export default () => {
  // เดิม (db)
  const router = express.Router();
  // router.use(addressRoutes(db))
  // router.use("/mongo", mongoAddress) // คือไร? ติดไว้ก่อน 🥴
  router.use("/", addressRoutes); // ไม่จำเป็นต้องใส่ authUser ซ้ำ ที่ routes.js เว้นแต่จะอยาก auth ทั้ง group /address ทั้งหมด
  router.use("/", productRoutes);
  router.use("/", productUserRoutes);
  router.use("/", cartRoutes);
  router.use("/", userRoutes);
  router.use("/", orderConfirmRouters);
  router.use("/", orderRoutes);

  return router;
};
