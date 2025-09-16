import { Product } from "../../models/Product";

export const getAllProducts = async (_req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1, isPinned: -1 });
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

//gotta change this to be getProductById
// export const getAllProducts = async (_req, res) => {
//   try {
//     const products = await Product.find().sort({ createdAt: -1, isPinned: -1 });
//     return res.json({
//       error: false,
//       products,
//       message: "All products retrieved successfully",
//     });
//   } catch (err) {
//     return res.status(500).json({
//       error: true,
//       message: "Failed to fetch all products",
//       details: err.message,
//     });
//   }
// };

//createProduct
export const createProduct = async (req, res, next) => {
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
  } = req.body;

  const userId = req.user.user._id; // Logged-in user's MongoDB _id will lock with Admin's id only

  //Validate data before create
  if (!product_category || !product_name) {
    const error = new Error(
      "Required field still empty. Please fill the required field before try again"
    );
    error.status = 400;
    return next(error);
  }

  //Validate userId before allow to create
  if (!userId) {
    return res
      .status(401)
      .json({ error: true, message: "Unauthorized - no user ID found" });
  }

  try {
    const product = await Product.create({
      product_name,
      product_brand,
      product_category,
      product_image,
      product_color,
      product_price,
      product_stock,
      product_description,
      product_tag,
      userId, //recorded a userId of who create the product
    });

    return res.status(201).json({
      error: false,
      product,
      message: "Product created successfully",
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({
      error: true,
      message: "Internal Server Error",
    });
  }
};

//editProduct
export const editProduct = async (req, res, next) => {
  const productId = req.params.productId;
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
  } = req.body;
  const { user } = req.user;

  if (!product_category && !product_name) {
    return res
      .status(400)
      .json({ error: true, message: "No changes provided" });
  }

  try {
    const product = await Product.findOne({ _id: productId, userId: user._id }); //the userId is need because it's Admin only that able to edit

    if (!product) {
      return res
        .status(404)
        .json({ error: true, message: "Product not found" });
    }

    if (product_name) product.product_name = product_name;
    if (product_brand) product.product_brand = product_brand;
    if (product_category) product.product_category = product_category;
    if (product_image) product.product_image = product_image;
    if (product_color) product.product_color = product_color;
    if (product_price) product.product_price = product_price;
    if (product_stock) product.product_stock = product_stock;
    if (product_description) product.product_description = product_description;
    if (product_tag) product.product_tag = product_tag;

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
    });
  }
};

//deleteProduct
export const deleteProduct = async (req, res, next) => {
  const productId = req.params.id;

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
