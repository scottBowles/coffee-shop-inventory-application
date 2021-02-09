const multer = require("multer");
const Order = require("../models/order");

const uploadImage = multer({
  dest: "public/images/",
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/jpg$|png$|jpeg/)) {
      cb(new Error("Filetype must be .png, .jpg or .jpeg"), false);
    } else {
      cb(null, true);
    }
  },
  limits: { fieldSize: 1000000 },
}).single("imageUpload");

// create a hash of items -- { id: totalQuantityOnOrder }
async function getQuantitiesOnOrder() {
  const orders = await Order.find(
    { status: "Ordered" },
    "orderedItems"
  ).exec();

  const itemQtyHash = {};
  orders.forEach((order) => {
    order.orderedItems.forEach((orderedItem) => {
      const id = orderedItem.item.toString();
      if (itemQtyHash[id]) itemQtyHash[id] += orderedItem.quantity;
      else itemQtyHash[id] = orderedItem.quantity;
    });
  });

  return itemQtyHash;
}

module.exports = {
  uploadImage, getQuantitiesOnOrder,
}