// controllers/ordersController.js
import mongoose from "mongoose";
import { User } from "../../models/User.js";
import { Product } from "../../models/Product.js"; // ถ้าต้องตรวจสต็อก/ราคาในอนาคต
import { Order } from "../../models/Order.js";

const toInt = (n) => Math.max(0, Math.round(Number(n) || 0));

// --- Normalizers / Validators ---
const normalizeAddressToSchema = (a) => ({
  address_firstname: a?.firstname ?? "",
  address_lastname: a?.lastname ?? "",
  address_phonenumber: a?.phone ?? "",
  address_subdistrict: a?.subdistrict ?? "",
  address_district: a?.district ?? "",
  address_province: a?.province ?? "",
  address_postalcode: a?.postalcode ?? "",
  // NOTE: ถ้าจะเก็บบรรทัดที่อยู่หลัก เพิ่ม field address_line1 ใน schema แล้ว map จาก a.line1
});

const validateAddressSchema = (addr) => {
  const required = [
    "address_firstname",
    "address_lastname",
    "address_phonenumber",
    "address_subdistrict",
    "address_district",
    "address_province",
    "address_postalcode",
  ];
  for (const k of required) {
    if (!addr?.[k]) return `Missing field: ${k}`;
  }
  return null;
};

// อ่าน user_cart แล้วแปลงให้พร้อมใช้งานบน FE (รองรับ session สำหรับทรานแซกชัน)
const readCartSnapshot = async (userId, { session } = {}) => {
  let q = User.findById(userId)
    .select("user_cart")
    .populate({
      path: "user_cart.product_id",
      model: "Product",
      select:
        "product_name product_image product_color product_price stock is_active",
    })
    .lean();
  if (session) q = q.session(session);

  const user = await q;
  const cartItems = user?.user_cart ?? [];

  const items = cartItems.map((i) => {
    const price = toInt(i.product_price ?? i.product_id?.product_price ?? 0);
    const qty = Number(i.product_qty || 1);
    return {
      product_id: i.product_id?._id ?? i.product_id,
      name: i.product_name ?? i.product_id?.product_name,
      image: i.product_image ?? i.product_id?.product_image,
      color: i.product_color ?? i.product_id?.product_color,
      price,
      qty,
      line_total: toInt(price * qty),
    };
  });

  const subtotal = items.reduce((s, it) => s + it.line_total, 0);
  return {
    items,
    subtotal: toInt(subtotal),
    currency: "THB",
  };
};

// (ถ้าจะเข้มงวด) ตรวจสต็อก/สถานะ และกันราคาเพี้ยน
// const assertStock = async (items, { session } = {}) => {
//   const ids = items.map((it) => it.product_id);
//   let q = Product.find({ _id: { $in: ids } })
//     .select("_id stock is_active product_price")
//     .lean();
//   if (session) q = q.session(session);
//   const products = await q;
//   const map = new Map(products.map((p) => [String(p._id), p]));
//   for (const it of items) {
//     const p = map.get(String(it.product_id));
//     if (!p || p.is_active === false) throw new Error(`Product not available: ${it.product_id}`);
//     if (typeof p.stock === "number" && p.stock < it.qty) throw new Error(`Insufficient stock: ${it.product_id}`);
//     // ถ้าต้องล็อคราคา:
//     // if (toInt(p.product_price) !== toInt(it.price)) throw new Error(`Price changed: ${it.product_id}`);
//   }
// };

// ============== Controllers ==============

// GET /orders/cart  --> ใช้กับส่วน JSX ที่แสดงสินค้าในตะกร้า
export const getCheckoutCart = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const snap = await readCartSnapshot(userId);

    return res.json({
      items: snap.items,
      subtotal: snap.subtotal,
      count_items: snap.items.reduce((s, it) => s + it.qty, 0),
      count_lines: snap.items.length,
      currency: snap.currency,
    });
  } catch (e) {
    next(e);
  }
};

// POST /orders
// Body:
// {
//   "address": { "firstname","lastname","phone","subdistrict","district","province","postalcode","line1"? },
//   "payment": { "method":"credit_card"|"bank_transfer"|"cod", "status":"pending"|"paid"|"failed", "transactionId"? }
// }
// ส่งฟรีทั่วประเทศ -> shippingFee = 0, discount = 0
// ✅ แก้ไข: ทำในทรานแซกชัน -> สร้าง Order แล้วล้าง user_cart ให้กลายเป็น []
export const createOrderFromCart = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    let createdOrder;

    await session.withTransaction(async () => {
      // 1) snapshot ตะกร้า (ใน session)
      const snap = await readCartSnapshot(userId, { session });
      if (!snap.items.length) {
        throw new Error("CART_EMPTY");
      }

      // await assertStock(snap.items, { session }); // เปิดใช้ถ้าต้องการ

      // 2) แปลงที่อยู่ให้ตรง schema
      const addrRaw = req.body?.address || {};
      const addr = normalizeAddressToSchema(addrRaw);
      const addrErr = validateAddressSchema(addr);
      if (addrErr) {
        const err = new Error(addrErr);
        err.code = "ADDR_INVALID";
        throw err;
      }

      // 3) payment info
      const paymentRaw = req.body?.payment || {};
      const method = ["bank_transfer", "cod", "credit_card"].includes(
        paymentRaw.method
      )
        ? paymentRaw.method
        : "credit_card";
      const status = ["paid", "failed", "pending"].includes(paymentRaw.status)
        ? paymentRaw.status
        : "pending";
      const transactionId = paymentRaw.transactionId || undefined;

      // 4) คิดยอด
      const order_subtotal = toInt(snap.subtotal);
      const order_shippingFee = 0;
      const order_discount = 0;
      const order_total = toInt(
        order_subtotal + order_shippingFee - order_discount
      );

      // 5) map รายการเป็น order_items
      const order_items = snap.items.map((it) => ({
        product_id: it.product_id,
        product_name: it.name,
        product_image: it.image,
        product_color: it.color,
        product_qty: it.qty,
        product_price: it.price,
        product_subtotal: it.line_total,
      }));

      // 6) สถานะคำสั่งซื้ออิงสถานะชำระเงิน
      const order_status = status === "paid" ? "paid" : "pending";

      // 7) บันทึกคำสั่งซื้อ (ใน session)
      createdOrder = await Order.create(
        [
          {
            user_id: userId,
            order_subtotal,
            order_shippingFee,
            order_discount,
            order_total,
            order_status,
            order_items,
            order_shipping_address: addr,
            order_payment: { method, status, transactionId },
          },
        ],
        { session }
      ).then((docs) => docs[0]);

      // 8) ✅ ล้างตะกร้าใน BE ให้กลายเป็น []
      await User.updateOne(
        { _id: userId },
        { $set: { user_cart: [] } },
        { session }
      );
    });

    // สำเร็จ
    return res.status(201).json({
      order_id: createdOrder._id.toString(),
      order_status: createdOrder.order_status,
      amount: createdOrder.order_total,
      currency: "THB",
      created_at: createdOrder.createdAt,
    });
  } catch (e) {
    if (e?.message === "CART_EMPTY") {
      return res.status(400).json({ error: true, message: "Cart is empty." });
    }
    if (e?.code === "ADDR_INVALID") {
      return res.status(400).json({ error: true, message: e.message });
    }
    next(e);
  } finally {
    session.endSession();
  }
};

// GET /orders/:orderId
export const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: true, message: "Invalid orderId" });
    }

    const order = await Order.findOne({
      _id: orderId,
      user_id: req.user._id,
    }).lean();

    if (!order)
      return res.status(404).json({ error: true, message: "Order not found" });

    return res.json(order);
  } catch (e) {
    next(e);
  }
};

// PATCH /orders/:orderId/payment
// ใช้หน้า Payment (เลือก COD/QR เดโม) เพื่ออัปเดตวิธีจ่าย/สถานะ
export const updateOrderPayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: true, message: "Invalid orderId" });
    }

    const method = req.body?.method;
    const status = req.body?.status;
    const transactionId = req.body?.transactionId;

    if (!["credit_card", "bank_transfer", "cod"].includes(method)) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid payment method" });
    }
    if (!["pending", "paid", "failed"].includes(status)) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid payment status" });
    }

    const order = await Order.findOne({
      _id: orderId,
      user_id: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ error: true, message: "Order not found" });
    }

    if (["shipped", "delivered", "cancelled"].includes(order.order_status)) {
      return res.status(400).json({
        error: true,
        message: "Order can’t be updated in current status",
      });
    }

    order.order_payment = { method, status, transactionId };
    order.order_status = status === "paid" ? "paid" : "pending";
    await order.save();

    return res.json({
      order_id: order._id.toString(),
      order_status: order.order_status,
      order_payment: order.order_payment,
      updated_at: order.updatedAt,
    });
  } catch (e) {
    next(e);
  }
};
