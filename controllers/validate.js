const { body, param } = require('express-validator');

function id({ message = 'Invalid id', name = 'id' }) {
  return param(name).isMongoId().withMessage(message).escape();
}

function password() {
  return body('password')
    .custom((value) => {
      if (value !== process.env.ADMIN_PASSWORD) {
        throw new Error('Invalid password');
      }
      return true;
    })
    .escape();
}

function submitType(name, options) {
  return body(name).isIn(options).escape();
}

function escapeParam(name) {
  return param(name).escape();
}

function category() {
  return [
    body('name', 'Category name must between 1 and 100 characters long')
      .trim()
      .isLength({ min: 1, max: 100 })
      .escape(),
    body(
      'description',
      'Category description must be between 1 and 256 characters long'
    )
      .trim()
      .isLength({ min: 1, max: 256 })
      .escape(),
  ];
}

function countInput() {
  return [
    body('items.*.id').escape(),
    body('items.*.quantity').isInt({ lt: 10000000 }).escape(),
    body('filter').escape(),
  ];
}

function item() {
  return [
    body('name')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Item name required')
      .isLength({ max: 40 })
      .withMessage('Item name max of 40 characters exceeded')
      .escape(),
    body('description', 'Description max of 256 characters exceeded')
      .optional({ checkFalsy: true })
      .isLength({ max: 256 })
      .escape(),
    body('sku', 'SKU must be 24 characters or less')
      .optional({ checkFalsy: true })
      .isLength({ max: 24 })
      .escape(),
    body('price', 'We could never charge that!')
      .optional({ checkFalsy: true })
      .isFloat({ min: 0, max: 9999999 })
      .escape(),
    body(
      'quantityInStock',
      "Quantity must be an integer between 0 and 9999999 (limiting, but it's inclusive at least!)"
    )
      .isInt({ min: 0, max: 9999999 })
      .toInt(),
    body('category').optional({ checkFalsy: true }).escape(),
    body(
      'itemLastUpdated',
      'ItemLastUpdated must be a valid date. (If you are seeing this as an end user, please report this error.)'
    )
      .toDate()
      .escape(),
  ];
}

function orderedItems() {
  return [
    body('orderedItems.*.id').escape(),
    body('orderedItems.*.quantity').isInt({ lt: 10000000 }).escape(),
  ];
}

function receivedItems() {
  return [
    body('receivedItems.*.id').escape(),
    body('receivedItems.*.quantity')
      .optional({ checkFalsy: true })
      .isInt({ lt: 10000000 })
      .escape(),
  ];
}

module.exports = {
  id,
  password,
  submitType,
  escapeParam,
  category,
  countInput,
  item,
  orderedItems,
  receivedItems,
};
