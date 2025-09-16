import mongoose, { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

const CartSchema = new Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    product_status: {
      type: String,
      enum: ["Selected", "Checkout"],
      default: "Selected",
    },
    product_name: { type: String, required: true },
    product_image: { type: String, required: true },
    product_color: { type: String, required: true },
    product_price: { type: Number, required: true, min: 0 },
    product_qty: { type: Number, required: true, min: 1 },
  },
  { _id: true, timestamps: true }
);

const AddressSchema = new Schema(
  {
    address_firstname: { type: String, required: true, trim: true },
    address_lastname: { type: String, required: true, trim: true },
    address_phonenumber: { type: String, required: true, trim: true },
    address_address: { type: String, required: true, trim: true },
    address_subdistrict: { type: String, required: true, trim: true },
    address_district: { type: String, required: true, trim: true },
    address_province: { type: String, required: true, trim: true },
    address_postalcode: { type: String, required: true, trim: true },
  },
  { _id: true, timestamps: true }
);

const UserSchema = new Schema(
  {
    user_name: { type: String, required: true, trim: true },
    user_lastname: { type: String, required: true, trim: true },
    user_username: { type: String, default: "", trim: true },
    user_email: { type: String, required: true, unique: true, trim: true },
    user_password: { type: String, required: true },
    user_role: { type: String, enum: ["User", "Admin"], default: "User" },
    user_image: { type: String, default: null },
    user_cart: { type: [CartSchema], default: [] },
    user_address: { type: [AddressSchema], default: [] },
  },
  { timestamps: true }
);

//Hash password before saving to DB
UserSchema.pre("save", async function (next) {
  if (!this.isModified("user_password")) return next();
  this.user_password = await bcrypt.hash(this.user_password, 10);
  next();
});

export const User = model("User", UserSchema, "user");
