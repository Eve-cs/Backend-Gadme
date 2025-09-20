import { Schema, model } from "mongoose";

// subschema: order_items
const OrderItemSchema = new Schema(
  {
    product_id: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    product_name: { type: String, required: true },
    product_image: { type: String },
    product_color: { type: String },
    product_qty: { type: Number, required: true },
    product_price: { type: Number, required: true },
    product_subtotal: { type: Number, required: true },
  },
  { _id: true }
);

// subschema: shipping address (ไทย)
const ShippingAddressSchema = new Schema(
  {
    address_firstname: { type: String, required: true },
    address_lastname: { type: String, required: true },
    address_phonenumber: { type: String, required: true },
    address_subdistrict: { type: String, required: true },
    address_district: { type: String, required: true },
    address_province: { type: String, required: true },
    address_postalcode: { type: String, required: true },
  },
  { _id: true }
);

// subschema: payment
const PaymentSchema = new Schema(
  {
    method: {
      type: String,
      enum: ["credit_card", "bank_transfer", "cod"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    transactionId: { type: String },
  },
  { _id: false }
);

// main schema
const OrderSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    order_subtotal: { type: Number, required: true },
    order_shippingFee: { type: Number, default: 0 },
    order_discount: { type: Number, default: 0 },
    order_total: { type: Number, required: true },

    order_status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    order_items: { type: [OrderItemSchema], default: [] },
    order_shipping_address: ShippingAddressSchema,
    order_payment: PaymentSchema,
  },
  { timestamps: true }
);

export const Order = model("Order", OrderSchema);
