import { Product } from "../../models/Product.js";

/* ---------- helpers: map UI <-> DB ---------- */
function uiToDb(body = {}) {
  const features = Array.isArray(body.features)
    ? body.features
    : String(body.features || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const v0 = (body.variances && body.variances[0]) || {};
  const image = Array.isArray(v0.image) ? v0.image[0] ?? "" : v0.image || "";

  return {
    product_name: body.productname ?? "",
    product_brand: body.brand ?? "",
    product_category: body.category ?? "",
    product_description: body.description ?? "",
    product_tag: tags,
    product_color: v0.color ?? "",
    product_image: image ?? "",
    product_stock: Number(v0.stock ?? 0),
    product_price: Number(v0.price ?? 0),
  };
}

function dbToUi(doc) {
  return {
    id: String(doc._id),
    category: doc.product_category ?? "",
    productname: doc.product_name ?? "",
    description: doc.product_description ?? "",
    brand: doc.product_brand ?? "",
    modelname: "",
    warrantyinfo: "",
    relatedproduct: [],
    tags: Array.isArray(doc.product_tag) ? doc.product_tag : [],
    variances: [
      {
        color: doc.product_color ?? "",
        image: doc.product_image ?? "",
        stock: Number(doc.product_stock ?? 0),
        price: Number(doc.product_price ?? 0),
      },
    ],
  };
}

/* ---------- Public (User) ---------- */
export const getProductsByName = async (req, res, next) => {
  const { product_name } = req.params;
  try {
    const products = await Product.find({ product_name }).sort({
      product_price: 1,
      _id: 1,
    });
    res
      .status(200)
      .json({ error: false, products, message: "Get product successfully!" });
  } catch (err) {
    next(err);
  }
};

export const getAllProducts = async (_req, res, next) => {
  try {
    const products = await Product.aggregate([
      { $sort: { product_name: 1, product_price: 1, _id: 1 } },
      {
        $group: {
          _id: "$product_name",
          id: { $first: "$_id" },
          product_image: { $first: "$product_image" }, // รูปของตัวถูกสุด
          minPrice: { $first: "$product_price" },
          product_brand: { $first: "$product_brand" },
          product_category: { $first: "$product_category" },
          product_tag: { $first: "$product_tag" },
        },
      },
      { $sort: { minPrice: 1, _id: 1 } },
    ]);
    res
      .status(200)
      .json({ error: false, products, message: "All products successfully!" });
  } catch (err) {
    next(err);
  }
};

/* ---------- Admin (UI shape) ---------- */
export const listProducts = async (_req, res, next) => {
  try {
    const docs = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ error: false, items: docs.map(dbToUi) });
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const doc = await Product.findById(req.params.id);
    if (!doc)
      return res
        .status(404)
        .json({ error: true, message: "Product not found" });
    res.status(200).json({ error: false, product: dbToUi(doc) });
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const doc = await new Product(uiToDb(req.body)).save();
    res
      .status(201)
      .json({ error: false, product: dbToUi(doc), message: "Product created" });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const doc = await Product.findByIdAndUpdate(
      req.params.id,
      uiToDb(req.body),
      {
        new: true,
        runValidators: true,
      }
    );
    if (!doc)
      return res
        .status(404)
        .json({ error: true, message: "Product not found" });
    res
      .status(200)
      .json({ error: false, product: dbToUi(doc), message: "Product updated" });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const doc = await Product.findByIdAndDelete(req.params.id);
    if (!doc)
      return res
        .status(404)
        .json({ error: true, message: "Product not found" });
    res.status(200).json({ error: false, message: "Product deleted" });
  } catch (err) {
    next(err);
  }
};
