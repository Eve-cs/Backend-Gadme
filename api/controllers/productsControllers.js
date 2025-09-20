import { Product } from "../../models/Product.js";

/* ---------- helpers ---------- */
// แปลง tags ให้เป็น array และรองรับทั้งชื่อคีย์ product_tag / tags
const normalizeTags = (body) => {
  const raw = body?.product_tag ?? body?.tags ?? body?.productTags ?? [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

// ดึง userId ให้ทนทานขึ้น (บางโปรเจคเก็บไว้ที่ req.user.user._id, บางที่ req.user._id)
const getUserIdSafe = (req) => req?.user?.user?._id ?? req?.user?._id ?? null;
/* -------------------------------- */

export const getAllProducts = async (_req, res) => {
  try {
    // ⚠️ เดิม sort({ createdAt: -1, isPinned: -1 }) ถ้า schema ไม่มี isPinned ก็ไม่พัง
    // แต่เพื่อความชัดเจน เหลือ createdAt พอ (ถ้าอยากคง isPinned ไว้ ให้เพิ่มกลับได้)
    const products = await Product.find().sort({ createdAt: -1 }); // ✅ ปรับเล็กน้อย
    return res.json({
      error: false,
      products,
      message: "All products retrieved successfully",
    });
  } catch (err) {
    return res.status(500).json({
      error: true,
      message: "Failed to fetch all products",
      details: err.message,
    });
  }
};

//getProductById
export const getProductById = async (req, res) => {
  const id = req.params.productId ?? req.params.id; // ✅ รองรับทั้งสองชื่อพารามิเตอร์
  const item = await Product.findById(id);
  if (!item) return res.status(404).json({ data: null, error: "NOT_FOUND" });
  res.json({ data: item, error: null });
};

export const createProduct = async (req, res, next) => {
  try {
    const {
      product_name,
      product_brand,
      product_category,
      product_description = "",
      product_tag: incomingTags, // รับชื่อเดียวกับ FE

      // single-variant (fallback)
      product_image,
      product_color,
      product_price,
      product_stock,

      // many variants
      variances = [],
    } = req.body;

    // ---- แปลง tags ให้เป็น array เสมอ ----
    const product_tag = Array.isArray(incomingTags)
      ? incomingTags
      : typeof incomingTags === "string" && incomingTags.trim()
      ? incomingTags.split(",").map((s) => s.trim())
      : [];

    // ---- validate ขั้นต้น ----
    if (!product_name || !product_category) {
      return res.status(400).json({
        error: true,
        message: "Required field still empty. Please fill the required field.",
      });
    }

    // ---- ถ้ามีหลาย variant: แตกเอกสาร ----
    if (Array.isArray(variances) && variances.length > 0) {
      const docs = variances
        .filter(
          (v) =>
            v &&
            (v.product_color ||
              v.product_price ||
              v.product_stock ||
              v.product_image ||
              v.color ||
              v.price ||
              v.stock ||
              v.image) // เผื่อเคสเดิม
        )
        .map((v) => {
          const color = v.product_color ?? v.color ?? "";
          const price = Number(v.product_price ?? v.price ?? 0);
          const stock = Number(v.product_stock ?? v.stock ?? 0);
          const imgRaw = v.product_image ?? v.image;

          const img = Array.isArray(imgRaw)
            ? imgRaw[0] ?? ""
            : typeof imgRaw === "string"
            ? imgRaw
            : "";

          return {
            product_name,
            product_brand,
            product_category,
            product_description,
            product_tag,
            product_color: color,
            product_price: price,
            product_stock: stock,
            product_image: img,
          };
        });

      if (docs.length > 0) {
        const createdMany = await Product.insertMany(docs);
        return res.status(201).json({
          error: false,
          products: createdMany,
          count: createdMany.length,
          message: "Products created successfully from variances",
        });
      }
    }

    // ---- ไม่มี variances: สร้างตัวเดียวจาก top-level ----
    const created = await Product.create({
      product_name,
      product_brand,
      product_category,
      product_description,
      product_tag,
      product_color: product_color ?? "",
      product_price: Number(product_price ?? 0),
      product_stock: Number(product_stock ?? 0),
      product_image: product_image ?? "",
    });

    return res.status(201).json({
      error: false,
      product: created,
      message: "Product created successfully",
    });
  } catch (error) {
    return next(error);
  }
};

//editProduct
export const editProduct = async (req, res, next) => {
  const productId = req.params.productId ?? req.params.id; // ✅ รองรับทั้งสองชื่อ
  const {
    product_name,
    product_brand,
    product_category,
    product_image,
    product_color,
    product_price,
    product_stock,
    product_description,
    product_tag,
    variances, // ✅ ถ้ามี variances ใหม่ จะอัปเดตให้
    // product_tag / tags จะ normalize ด้านล่าง
  } = req.body;

  const userId = getUserIdSafe(req); // ✅ เอาไว้เช็คเจ้าของ (ถ้าเก็บ userId ในสินค้า)

  if (
    !product_category &&
    !product_name &&
    !product_brand &&
    !product_image &&
    !product_color &&
    typeof product_price === "undefined" &&
    typeof product_stock === "undefined" &&
    !product_description &&
    !req.body.product_tag &&
    !req.body.tags &&
    !variances
  ) {
    return res
      .status(400)
      .json({ error: true, message: "No changes provided" });
  }

  try {
    // เดิมใช้ findOne({ _id, userId }) ล็อกให้เจ้าของแก้ได้
    // ถ้ายังอยากล็อกแบบเดิมและมีการเก็บ userId ในสินค้า ให้ใช้บรรทัดนี้:
    // const product = await Product.findOne({ _id: productId, userId });

    // ถ้ายังไม่ได้เก็บ userId ในสินค้า/หรือให้อะดมินแก้ได้ทุกตัว ใช้ findById แทน:
    const product =
      (userId ? await Product.findOne({ _id: productId, userId }) : null) ||
      (await Product.findById(productId)); // ✅ ยืดหยุ่นขึ้น

    if (!product) {
      return res
        .status(404)
        .json({ error: true, message: "Product not found" });
    }

    // set ทีละ field เฉพาะที่มีค่าเข้ามา
    if (product_name) product.product_name = product_name;
    if (product_brand) product.product_brand = product_brand;
    if (product_category) product.product_category = product_category;
    if (product_image) product.product_image = product_image;
    if (product_color) product.product_color = product_color;
    if (typeof product_price !== "undefined")
      product.product_price = Number(product_price);
    if (typeof product_stock !== "undefined")
      product.product_stock = Number(product_stock);
    if (product_description) product.product_description = product_description;

    // ✅ อัปเดต tags ให้รองรับทั้ง product_tag / tags
    const finalTags = normalizeTags(req.body);
    if (finalTags.length) product.product_tag = finalTags;

    // ✅ ถ้ามี variances ใหม่ ส่งมาเป็น array ก็แทนที่ทั้งก้อน
    if (Array.isArray(variances)) {
      product.variances = normalizeVariances(variances);
    }

    await product.save();

    return res.json({
      error: false,
      product,
      message: "Product updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
      details: error?.message,
    });
  }
};

//deleteProduct
export const deleteProduct = async (req, res, next) => {
  const productId = req.params.productId ?? req.params.id; // ✅ รองรับทั้งสองชื่อ

  try {
    const product = await Product.findOne({ _id: productId });

    if (!product) {
      const error = new Error("Product not found😥");
      error.status = 404;
      return next(error);
    }

    await Product.deleteOne({ _id: productId });
    res.status(200).json({
      error: false,
      message: "Product delete successfully!🍁",
    });
  } catch (err) {
    next(err);
  }
};
