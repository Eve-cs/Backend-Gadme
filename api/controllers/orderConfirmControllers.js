import express from "express";
import { Order } from "../../models/Order.js";

// postOrder
export const postOrder = async (req, res, next) => {
  try {
    const order = await Order.create(req.body);
    res.status(200).json({
      message: "Order created successfully",
      order,
    });
  } catch (err) {
    next(err);
  }
};

// getOrder
export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
};
