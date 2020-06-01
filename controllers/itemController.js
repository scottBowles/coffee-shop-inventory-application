const async = require("async");
const validator = require("express-validator");
const Item = require("../models/item");
const Category = require("../models/category");
const Order = require("../models/order");

exports.item_home = function itemHome(req, res, next) {
  async.auto(
    {
      categories(callback) {
        Category.find({}, "name").sort({ name: "ascending" }).exec(callback);
      },
      queryFilter: [
        "categories",
        (results, callback) => {
          const { filter } = req.query;
          const categoryNames = results.categories.map(
            (category) => category.name
          );
          const sanitizedFilter = categoryNames.includes(filter)
            ? filter
            : "All";
          callback(null, sanitizedFilter);
        },
      ],
      items: [
        "queryFilter",
        "categories",
        (results, callback) => {
          const { categories, queryFilter } = results;
          if (queryFilter !== "All") {
            const category = categories.find((cat) => cat.name === queryFilter);
            Item.find({ category: category._id })
              .sort({ sku: "ascending", name: "ascending" })
              .populate("category")
              .exec(callback);
          } else {
            Item.find({})
              .sort({ sku: "ascending", name: "ascending" })
              .populate("category")
              .exec(callback);
          }
        },
      ],
      orderedQuantities: [
        "items",
        (results, callback) => {
          const { items } = results;
          Order.find({ status: "Ordered" }, "orderedItems").exec(
            (err, orders) => {
              if (err) {
                return next(err);
              }
              const quantities = {};
              items.forEach((item) => {
                const itemQty = orders.reduce((total, order) => {
                  const itemInOrder = order.orderedItems.find((orderedItem) => {
                    return item._id.equals(orderedItem.item);
                  });
                  const quantityInOrder = itemInOrder
                    ? itemInOrder.quantity
                    : 0;
                  return total + quantityInOrder;
                }, 0);
                quantities[item] = itemQty;
              });
              callback(null, quantities);
            }
          );
        },
      ],
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      res.render("itemsHome", {
        title: "Items",
        orderedQty: results.orderedQuantities,
        items: results.items,
        categories: results.categories,
        filter: results.queryFilter,
      });
    }
  );
};

exports.item_detail = function itemDetail(req, res, next) {
  Item.findById(req.params.id)
    .populate("category")
    .exec((err, item) => {
      if (err) {
        return next(err);
      }
      res.render("itemDetail", { item });
    });
};

exports.item_create_get = function itemCreateGet(req, res, next) {
  Category.find({}).exec((err, categories) => {
    if (err) {
      return next(err);
    }
    res.render("itemForm", { title: "Create New Item", categories });
  });
};

exports.item_create_post = [
  validator.body("name", "Item name required").trim().isLength({ min: 1 }),
  validator.sanitizeBody("name").escape(),
  validator.sanitizeBody("description").escape(),
  validator.sanitizeBody("sku").escape(),
  validator.sanitizeBody("price").escape(),
  validator.sanitizeBody("quantityInStock").escape(),
  validator.sanitizeBody("category").escape(),
  validator.sanitizeBody("itemLastUpdated").escape(),

  (req, res, next) => {
    const errors = validator.validationResult(req);

    const item = new Item({
      name: req.body.name,
      description: req.body.description,
      sku: req.body.sku || undefined,
      price: req.body.price || undefined,
      quantityInStock: req.body.quantityInStock || 0,
      category: req.body.category || undefined,
    });

    if (!errors.isEmpty()) {
      Category.find({}).exec((err, categories) => {
        if (err) {
          return next(err);
        }
        res.render("itemForm", {
          item,
          categories,
          title: "Create New Item",
          errors: errors.array(),
        });
      });
    } else {
      Item.findOne({ name: req.body.name }).exec((err, foundItem) => {
        if (err) {
          return next(err);
        }
        if (foundItem) {
          res.redirect(foundItem.url);
        } else {
          item.save((itemSaveError) => {
            if (itemSaveError) {
              return next(itemSaveError);
            }
            res.redirect(item.url);
          });
        }
      });
    }
  },
];
// Validate form data
// Sanitize form data
// Handle validation / sanitizing errors (render itemForm with sanitized data)
// If no errors, create new Item and redirect to the new item's page

// Remember to check whether quantityInStock has been updated, and if so, create an Ad Hoc count
// Remember to change qtyLastUpdated if quantityInStock changes

exports.item_update_get = function itemUpdateGet(req, res, next) {
  res.send("NOT IMPLEMENTED: Item update GET");
};

exports.item_update_post = function itemUpdatePost(req, res, next) {
  res.send("NOT IMPLEMENTED: Item update POST");
  // Remember to check whether quantityInStock has been updated, and if so, create an Ad Hoc count
  // Remember to change qtyLastUpdated if quantityInStock changes
};

exports.item_delete_get = function itemDeleteGet(req, res, next) {
  res.send("NOT IMPLEMENTED: Item delete GET");
};

exports.item_delete_post = function itemDeletePost(req, res, next) {
  res.send("NOT IMPLEMENTED: Item delete POST");
};
