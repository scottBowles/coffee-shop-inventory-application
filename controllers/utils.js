const multer = require('multer');
const Order = require('../models/order');

const uploadImage = multer({
  dest: 'public/images/',
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/jpg$|png$|jpeg/)) {
      cb(new Error('Filetype must be .png, .jpg or .jpeg'), false);
    } else {
      cb(null, true);
    }
  },
  limits: { fieldSize: 1000000 },
}).single('imageUpload');

// create a hash of items -- { id: totalQuantityOnOrder }
async function getQuantitiesOnOrder() {
  const orders = await Order.find({ status: 'Ordered' }, 'orderedItems').exec();

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

function sortCountedQuantitiesByCategoryThenName(item1, item2) {
  const cat1 = item1.category ? item1.category.name : '(None)';
  const cat2 = item2.category ? item2.category.name : '(None)';
  if (cat1 !== cat2) {
    if (cat1 === '(None)') return 1;
    if (cat2 === '(None)') return -1;
    return cat1.toLowerCase() > cat2.toLowerCase() ? 1 : -1;
  }
  return item1.name.toLowerCase() > item2.name.toLowerCase() ? 1 : -1;
}

function sortCountedQuantitiesBySkuThenName(a, b) {
  if (a.item.sku !== b.item.sku) {
    return a.item.sku > b.item.sku ? 1 : -1;
  }
  return a.item.nameNormalized > b.item.nameNormalized ? 1 : -1;
}

module.exports = {
  uploadImage,
  getQuantitiesOnOrder,
  sortCountedQuantitiesByCategoryThenName,
  sortCountedQuantitiesBySkuThenName,
};
