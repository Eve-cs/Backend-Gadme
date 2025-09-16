import dotenv from "dotenv";
import express from "express";
import {
  createProduct,
  deleteProduct,
  editProduct,
  getAllProducts,
} from "../controllers/productsControllers.js";
import { authUser } from "../../middleware/auth";

dotenv.config();

const router = express.Router();

//for all product from the website without auth - PUBLIC
//GET all products
router.get("/products", getAllProducts);
router.get("/products/:productId", getProductById);

//POST a new product in database
router.post("/products", createProduct);

//Add Product by auth admin only
router.post("/add-product", authUser, createProduct);

//Edit Product
router.put("/edit-product/:productId", authUser, editProduct);

//Delete Product
router.delete("/delete-product/:productId", authUser, deleteProduct);

//Below this are feature that we still don't have
//User add favorite
//router.put("/update-product-fav/:productId", authUser, togglefav)

export default router;
