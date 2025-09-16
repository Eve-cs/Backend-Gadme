import express from "express";
import { authUser, authRoles } from "../../middleware/auth.js";
import {
  // public
  getProductsByName,
  getAllProducts,
  // admin
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productsUserControllers.js";

const router = express.Router();

/* ---------- Public (User) endpoints ---------- */
// /productdetail/:product_name
router.get("/productdetail/:product_name", getProductsByName);

// /productlist
router.get("/productlist", getAllProducts);

/* ---------- Admin endpoints (protected) ---------- */
// prefix: /admin/products...
router.use("/admin", authUser, authRoles("Admin"));
router.get("/admin/products", listProducts);
router.get("/admin/products/:id", getProductById);
router.post("/admin/products", createProduct);
router.put("/admin/products/:id", updateProduct);
router.delete("/admin/products/:id", deleteProduct);

export default router;
