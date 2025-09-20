// api/controllers/cartControllers.js
import mongoose from "mongoose";
import { User } from "../../models/User.js";
import { Product } from "../../models/Product.js";

/* ------------------------------ Helpers ------------------------------ */

function computeCartSummary(cartItems = []) {
  const selected = cartItems.filter((it) => it.product_status === "Selected");
  const count_items = selected.reduce(
    (s, i) => s + Number(i?.product_qty || 0),
    0
  );
  const count_lines = selected.length;
  const subtotal = selected.reduce((s, i) => {
    const p =
      i?.product_id && typeof i.product_id === "object" ? i.product_id : null;
    const price = Number(i?.product_price ?? p?.product_price ?? 0);
    return s + price * Number(i?.product_qty || 0);
  }, 0);
  return { count_items, count_lines, subtotal };
}

export async function readUserCart(userId) {
  const user = await User.findById(userId)
    .select("user_cart")
    .populate({
      path: "user_cart.product_id",
      model: "Product",
      select: "product_name product_image product_price product_color stock",
    })
    .lean();

  const cartItems = user?.user_cart ?? [];
  const meta = computeCartSummary(cartItems);
  return { cartItems, ...meta };
}

export async function getCartMeta(userId) {
  const _id = mongoose.isValidObjectId(userId)
    ? new mongoose.Types.ObjectId(String(userId))
    : new mongoose.Types.ObjectId(userId);
  const r = await User.aggregate([
    { $match: { _id } },
    { $unwind: { path: "$user_cart", preserveNullAndEmptyArrays: true } },
    { $match: { "user_cart.product_status": "Selected" } },
    {
      $group: {
        _id: null,
        count_items: { $sum: { $ifNull: ["$user_cart.product_qty", 0] } },
        count_lines: { $sum: 1 },
        subtotal: {
          $sum: {
            $multiply: [
              { $ifNull: ["$user_cart.product_price", 0] },
              { $ifNull: ["$user_cart.product_qty", 0] },
            ],
          },
        },
      },
    },
  ]);
  return {
    count_items: r?.[0]?.count_items ?? 0,
    count_lines: r?.[0]?.count_lines ?? 0,
    subtotal: r?.[0]?.subtotal ?? 0,
  };
}

// GET /cart
export const getCartByUser = async (req, res, next) => {
  try {
    // ต้องผ่าน middleware authUser มาก่อนเสมอ
    if (!req.user?._id) {
      return res
        .status(401)
        .json({ error: true, message: "Not authenticated" });
    }

    // แปลงให้ชัวร์ + ตรวจสอบความถูกต้อง
    const idStr =
      typeof req.user._id === "string" ? req.user._id : req.user._id.toString();

    if (!mongoose.isValidObjectId(idStr)) {
      return res.status(400).json({ error: true, message: "Invalid user id" });
    }

    const userId = new mongoose.Types.ObjectId(idStr);

    const { cartItems, count_items, count_lines, subtotal } =
      await readUserCart(userId);

    return res.status(200).json({
      error: false,
      cartItems,
      count_items,
      count_lines,
      subtotal,
      count: count_items,
      message: "Get cart successfully!",
    });
  } catch (err) {
    next(err);
  }
};

// GET /cart/meta   → ใช้ sync badge/navbar ทีเดียว 2 ค่า
export const getCartMetaHandler = async (req, res, next) => {
  try {
    // ต้องผ่าน middleware authUser มาก่อนเสมอ
    if (!req.user?._id) {
      return res
        .status(401)
        .json({ error: true, message: "Not authenticated" });
    }

    // แปลงให้ชัวร์ + ตรวจสอบความถูกต้อง
    const idStr =
      typeof req.user._id === "string" ? req.user._id : req.user._id.toString();

    if (!mongoose.isValidObjectId(idStr)) {
      return res.status(400).json({ error: true, message: "Invalid user id" });
    }

    const userId = new mongoose.Types.ObjectId(idStr);
    const meta = await getCartMeta(userId);
    // เพื่อรองรับโค้ดเดิมที่อ่าน field "count"
    return res.json({ error: false, ...meta, count: meta.count_items });
  } catch (e) {
    next(e);
  }
};

// GET /cart/count  → backward compatible (นับ “ชิ้นรวม”)
export const countCartByUser = async (req, res, next) => {
  try {
    // ต้องผ่าน middleware authUser มาก่อนเสมอ
    if (!req.user?._id) {
      return res
        .status(401)
        .json({ error: true, message: "Not authenticated" });
    }

    // แปลงให้ชัวร์ + ตรวจสอบความถูกต้อง
    const idStr =
      typeof req.user._id === "string" ? req.user._id : req.user._id.toString();

    if (!mongoose.isValidObjectId(idStr)) {
      return res.status(400).json({ error: true, message: "Invalid user id" });
    }

    const userId = new mongoose.Types.ObjectId(idStr);
    const meta = await getCartMeta(userId);
    return res.json({ error: false, ...meta, count: meta.count_items });
  } catch (err) {
    next(err);
  }
};

export const addCartItem = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return res
        .status(401)
        .json({ error: true, message: "Not authenticated" });
    }

    const userIdStr = String(req.user._id);
    if (!mongoose.isValidObjectId(userIdStr)) {
      return res.status(400).json({ error: true, message: "Invalid user id" });
    }
    const userId = new mongoose.Types.ObjectId(userIdStr);

    const {
      product_id,
      product_color,
      product_qty = 1,
      product_status = "Selected",
    } = req.body ?? {};

    if (!product_id || !product_color) {
      return res
        .status(400)
        .json({ error: true, message: "Missing product_id or product_color" });
    }
    if (!mongoose.isValidObjectId(product_id)) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid product_id" });
    }

    const pid = new mongoose.Types.ObjectId(product_id);
    const qty = Math.max(1, parseInt(product_qty, 10) || 1);

    const prod = await Product.findById(pid)
      .select("product_name product_image product_price product_color stock")
      .lean();

    if (!prod) {
      return res
        .status(404)
        .json({ error: true, message: "Product not found" });
    }
    if (Array.isArray(prod.product_color)) {
      if (!prod.product_color.includes(product_color)) {
        return res
          .status(400)
          .json({ error: true, message: "Invalid product color" });
      }
    } else if (typeof prod.product_color === "string" && prod.product_color) {
      if (prod.product_color !== product_color) {
        return res
          .status(400)
          .json({ error: true, message: "Invalid product color" });
      }
    }

    const addQty =
      typeof prod.stock === "number" ? Math.min(qty, prod.stock) : qty;

    const incRes = await User.updateOne(
      {
        _id: userId,
        "user_cart.product_id": pid,
        "user_cart.product_color": product_color,
      },
      {
        $inc: { "user_cart.$.product_qty": addQty },
        $set: {
          "user_cart.$.product_status": product_status,
          "user_cart.$.product_price": prod.product_price,
          "user_cart.$.product_name": prod.product_name,
          "user_cart.$.product_image": prod.product_image,
          "user_cart.$.updatedAt": new Date(),
        },
      }
    );

    if (incRes.matchedCount === 0) {
      await User.updateOne(
        { _id: userId },
        {
          $push: {
            user_cart: {
              product_id: pid,
              product_status,
              product_name: prod.product_name,
              product_image: prod.product_image,
              product_color,
              product_price: prod.product_price,
              product_qty: addQty,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        }
      );
    }

    const meta = await getCartMeta(userId);
    return res.status(201).json({
      error: false,
      message: incRes.matchedCount ? "Increased quantity" : "Added to cart",
      ...meta,
      count: meta.count_items,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /cart/:itemId  (set absolute qty)
export const productQty = async (req, res, next) => {
  try {
    // ✅ ต้องผ่าน authUser มาก่อน
    if (!req.user?._id) {
      return res
        .status(401)
        .json({ error: true, message: "Not authenticated" });
    }

    // ✅ ตรวจ userId
    const userIdStr = String(req.user._id);
    if (!mongoose.isValidObjectId(userIdStr)) {
      return res.status(400).json({ error: true, message: "Invalid user id" });
    }
    const userId = new mongoose.Types.ObjectId(userIdStr);

    // ✅ รับพารามิเตอร์
    const { itemId } = req.params;
    const { product_qty } = req.body ?? {};

    if (!mongoose.isValidObjectId(itemId)) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid cart item id" });
    }
    const cartItemId = new mongoose.Types.ObjectId(itemId);

    // ✅ ตรวจค่า qty
    const qtyNum = Number(product_qty);
    if (!Number.isFinite(qtyNum) || qtyNum < 1) {
      return res
        .status(400)
        .json({ error: true, message: "product_qty must be a number >= 1" });
    }
    const qty = Math.floor(qtyNum);

    // ✅ ดึงไอเท็มในตะกร้า
    const found = await User.findOne(
      { _id: userId, "user_cart._id": cartItemId },
      { "user_cart.$": 1 }
    ).lean();

    if (!found?.user_cart?.[0]) {
      return res
        .status(404)
        .json({ error: true, message: "Cart item not found" });
    }

    // ✅ ถ้ามีสินค้าผูกอยู่ ให้เช็ค stock
    const item = found.user_cart[0];
    if (item?.product_id) {
      const prodId = item.product_id?._id || item.product_id;
      if (mongoose.isValidObjectId(prodId)) {
        const prod = await Product.findById(prodId).select("stock").lean();
        if (prod?.stock != null && qty > prod.stock) {
          return res
            .status(400)
            .json({ error: true, message: `จำนวนเกิน Stock (${prod.stock})` });
        }
      }
    }

    // ✅ อัปเดตจำนวน
    const upd = await User.updateOne(
      { _id: userId, "user_cart._id": cartItemId },
      {
        $set: {
          "user_cart.$.product_qty": qty,
          "user_cart.$.product_status": "Selected",
          "user_cart.$.updatedAt": new Date(),
        },
      }
    );

    if (upd.matchedCount === 0) {
      return res
        .status(404)
        .json({ error: true, message: "Cart item not found" });
    }

    // ✅ ส่ง meta กลับ (เผื่อ FE เก่าอ่าน field count)
    const meta = await getCartMeta(userId);
    return res.json({
      error: false,
      message: "Quantity updated",
      ...meta,
      count: meta.count_items,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /cart/:itemId/increase?step=1
export const increaseCartItemQty = async (req, res, next) => {
  try {
    // ต้องผ่าน authUser มาก่อน
    if (!req.user?._id) {
      return res
        .status(401)
        .json({ error: true, message: "Not authenticated" });
    }

    // ตรวจและแปลง userId
    const userIdStr = String(req.user._id);
    if (!mongoose.isValidObjectId(userIdStr)) {
      return res.status(400).json({ error: true, message: "Invalid user id" });
    }
    const userId = new mongoose.Types.ObjectId(userIdStr);

    // รับ params/query
    const { itemId } = req.params;
    if (!mongoose.isValidObjectId(itemId)) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid cart item id" });
    }
    const cartItemId = new mongoose.Types.ObjectId(itemId);

    const stepRaw = Number(req.query.step);
    const step = Math.max(
      1,
      Number.isFinite(stepRaw) ? Math.floor(stepRaw) : 1
    );

    // หาไอเท็มในตะกร้า (optional: เช็ค stock)
    const found = await User.findOne(
      { _id: userId, "user_cart._id": cartItemId },
      { "user_cart.$": 1 }
    ).lean();

    if (!found?.user_cart?.[0]) {
      return res
        .status(404)
        .json({ error: true, message: "Cart item not found" });
    }

    const item = found.user_cart[0];
    if (item?.product_id) {
      const prodId = item.product_id?._id || item.product_id;
      if (mongoose.isValidObjectId(prodId)) {
        const prod = await Product.findById(prodId).select("stock").lean();
        if (prod?.stock != null && item.product_qty + step > prod.stock) {
          return res
            .status(400)
            .json({ error: true, message: `จำนวนเกิน Stock (${prod.stock})` });
        }
      }
    }

    // เพิ่มจำนวน
    const upd = await User.updateOne(
      { _id: userId, "user_cart._id": cartItemId },
      {
        $inc: { "user_cart.$.product_qty": step },
        $set: {
          "user_cart.$.product_status": "Selected",
          "user_cart.$.updatedAt": new Date(),
        },
      }
    );

    if (upd.matchedCount === 0) {
      return res
        .status(404)
        .json({ error: true, message: "Cart item not found" });
    }

    const meta = await getCartMeta(userId); // { count_items, count_lines, subtotal }
    return res.json({
      error: false,
      message: "Increased",
      ...meta,
      count: meta.count_items,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /cart/:itemId/decrease?step=1
export const decreaseCartItemQty = async (req, res, next) => {
  try {
    // ต้องผ่าน authUser มาก่อน
    if (!req.user?._id) {
      return res
        .status(401)
        .json({ error: true, message: "Not authenticated" });
    }

    // ตรวจและแปลง userId
    const userIdStr = String(req.user._id);
    if (!mongoose.isValidObjectId(userIdStr)) {
      return res.status(400).json({ error: true, message: "Invalid user id" });
    }
    const userId = new mongoose.Types.ObjectId(userIdStr);

    // รับพารามิเตอร์
    const { itemId } = req.params;
    if (!mongoose.isValidObjectId(itemId)) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid cart item id" });
    }
    const cartItemId = new mongoose.Types.ObjectId(itemId);

    // step ขั้นต่ำ 1
    const stepRaw = Number(req.query.step);
    const step = Math.max(
      1,
      Number.isFinite(stepRaw) ? Math.floor(stepRaw) : 1
    );

    // อ่านไอเท็มในตะกร้า
    const doc = await User.findOne(
      { _id: userId, "user_cart._id": cartItemId },
      { "user_cart.$": 1 }
    ).lean();

    if (!doc?.user_cart?.[0]) {
      return res
        .status(404)
        .json({ error: true, message: "Cart item not found" });
    }

    const cur = Number(doc.user_cart[0].product_qty || 1);
    const nextQty = Math.max(1, cur - step);

    // อัปเดตจำนวน (ไม่ต่ำกว่า 1)
    const upd = await User.updateOne(
      { _id: userId, "user_cart._id": cartItemId },
      {
        $set: {
          "user_cart.$.product_qty": nextQty,
          "user_cart.$.product_status": "Selected",
          "user_cart.$.updatedAt": new Date(),
        },
      }
    );

    if (upd.matchedCount === 0) {
      return res
        .status(404)
        .json({ error: true, message: "Cart item not found" });
    }

    const meta = await getCartMeta(userId); // { count_items, count_lines, subtotal }
    return res.json({
      error: false,
      message: "Decreased",
      ...meta,
      count: meta.count_items,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /cart/:itemId
export const deleteCartById = async (req, res, next) => {
  try {
    // ต้องผ่าน authUser มาก่อน
    if (!req.user?._id) {
      return res
        .status(401)
        .json({ error: true, message: "Not authenticated" });
    }

    // ตรวจและแปลง userId
    const userIdStr = String(req.user._id);
    if (!mongoose.isValidObjectId(userIdStr)) {
      return res.status(400).json({ error: true, message: "Invalid user id" });
    }
    const userId = new mongoose.Types.ObjectId(userIdStr);

    // ตรวจและแปลง cart item id
    const { itemId } = req.params;
    if (!mongoose.isValidObjectId(itemId)) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid cart item id" });
    }
    const cartItemId = new mongoose.Types.ObjectId(itemId);

    // ลบรายการออกจากตะกร้า
    const upd = await User.updateOne(
      { _id: userId },
      { $pull: { user_cart: { _id: cartItemId } } }
    );

    if (upd.modifiedCount === 0) {
      return res
        .status(404)
        .json({ error: true, message: "Cart item not found" });
    }

    // อ่านตะกร้าใหม่ + สรุป meta
    const { cartItems } = await readUserCart(userId);
    const meta = computeCartSummary(cartItems); // { count_items, count_lines, subtotal }

    return res.json({
      error: false,
      cartItems,
      ...meta,
      count: meta.count_items, // เผื่อ FE เก่าอ่าน field "count"
      message: "Removed item",
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /cart
export const deleteCart = async (req, res, next) => {
  try {
    // ต้องผ่าน authUser มาก่อน
    if (!req.user?._id) {
      return res
        .status(401)
        .json({ error: true, message: "Not authenticated" });
    }

    // ตรวจและแปลง userId
    const userIdStr = String(req.user._id);
    if (!mongoose.isValidObjectId(userIdStr)) {
      return res.status(400).json({ error: true, message: "Invalid user id" });
    }
    const userId = new mongoose.Types.ObjectId(userIdStr);

    // ล้างตะกร้า
    await User.updateOne({ _id: userId }, { $set: { user_cart: [] } });

    return res.json({
      error: false,
      message: "Cart cleared",
      count_items: 0,
      count_lines: 0,
      subtotal: 0,
      count: 0, // backward compat
    });
  } catch (e) {
    next(e);
  }
};
