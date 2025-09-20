import express from "express";
import { getOrder, postOrder } from "../controllers/orderConfirmControllers.js";

const orderConfirmRouters = express.Router();

orderConfirmRouters.post("/order-confirm", postOrder);
orderConfirmRouters.get("/order-confirm/:id", getOrder);

export default orderConfirmRouters;
