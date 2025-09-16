import { User } from "../../models/User.js";

// getAddress
export const getAddress = async (req, res, next) => {
  // comment ออก หากจะ test โดยไม่ต้องใช้ token
  // if (!req.user || !req.user.id) {
  //   const error = new Error("Unauthorized: No user found in request object!");
  //   error.status = 401;
  //   return next(error);
  // }

  // mock userId ถ้าไม่มี token สำหรับ test โดยไม่ต้องใช้ token
  const userId = req.user?.id || req.user?._id || "TEST_USER";

  try {
    const address = await User.find();
    res.status(200).json({
      error: false,
      address,
      message: "Address retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

// createAddress
export const createAddress = async (req, res, next) => {
  // comment ออก หากจะ test โดยไม่ต้องใช้ token
  const userId = req.user.user._id;

  // mock userId ถ้าไม่มี token สำหรับ test โดยไม่ต้องใช้ token
  // const userId = req.user?.id || req.user?._id || "TEST_USER";

  const {
    address_firstname,
    address_lastname,
    address_phonenumber,
    address_address,
    address_subdistrict,
    address_district,
    address_province,
    address_postalcode = [],
  } = req.body;

  if (
    !address_firstname ||
    !address_lastname ||
    !address_phonenumber ||
    !address_address ||
    !address_subdistrict ||
    !address_district ||
    !address_province ||
    !address_postalcode
  ) {
    const error = new Error("Your shipping details are required!");
    error.status = 400;
    return next(error);
  }

  try {
    const address = {
      address_firstname,
      address_lastname,
      address_phonenumber,
      address_address,
      address_subdistrict,
      address_district,
      address_province,
      address_postalcode,
    };

    const allAddress = await User.findOneAndUpdate(
      { _id: userId },
      { $push: { user_address: address } },
      { new: true, upsert: true }
    );

    res.status(201).json({
      error: false,
      address,
      message: "Address created successfully",
    });
  } catch (error) {
    next(error);
  }
};

// updateAddress
export const updateAddress = async (req, res, next) => {
  // comment ออก หากจะ test โดยไม่ต้องใช้ token
  const userId = req.user._id;
  if (!req.user || !req.user._id) {
    const error = new Error("Unauthorized: No user found in request object!");
    error.status = 401;
    return next(error);
  }

  // mock userId ถ้าไม่มี token สำหรับ test โดยไม่ต้องใช้ token
  // const userId = req.user?.id || req.user?._id || "TEST_USER";

  const addressId = req.params.id;

  const {
    address_firstname,
    address_lastname,
    address_phonenumber,
    address_address,
    address_subdistrict,
    address_district,
    address_province,
    address_postalcode,
  } = req.body;

  try {
    const allAddress = await User.findOne({ "user_address._id": addressId });

    if (!allAddress) {
      const error = new Error("Address not found!");
      error.status = 404;
      return next(error);
    }

    const address = allAddress.user_address.id(addressId);

    if (!address) {
      const error = new Error("This address not found in all address!");
      error.status = 404;
      return next(error);
    }

    if (address_firstname) address.address_firstname = address_firstname;
    if (address_lastname) address.address_lastname = address_lastname;
    if (address_phonenumber) address.address_phonenumber = address_phonenumber;
    if (address_address) address.address_address = address_address;
    if (address_subdistrict) address.address_subdistrict = address_subdistrict;
    if (address_district) address.address_district = address_district;
    if (address_province) address.address_province = address_province;
    if (address_postalcode) address.address_postalcode = address_postalcode;

    await allAddress.save();
    res.status(201).json({
      error: false,
      address,
      message: "Address updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// deleteAddress
export const deleteAddress = async (req, res, next) => {
  // comment ออก หากจะ test โดยไม่ต้องใช้ token
  const userId = req.user._id;
  if (!req.user || !req.user._id) {
    const error = new Error("Unauthorized: No user found in request object!");
    error.status = 401;
    return next(error);
  }

  // mock userId ถ้าไม่มี token สำหรับ test โดยไม่ต้องใช้ token
  // const userId = req.user?.id || req.user?._id || "TEST_USER";

  const addressId = req.params.id;

  try {
    const allAddress = await User.findOne({ "user_address._id": addressId });

    if (!allAddress) {
      const error = new Error("Address not found!");
      error.status = 404;
      return next(error);
    }

    const address = allAddress.user_address.id(addressId);

    if (!address) {
      const error = new Error("This address not found in all address!");
      error.status = 404;
      return next(error);
    }

    await User.updateOne(
      { "user_address._id": addressId },
      { $pull: { user_address: { _id: addressId } } }
    );

    res.status(200).json({
      error: false,
      address,
      message: "Address deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
