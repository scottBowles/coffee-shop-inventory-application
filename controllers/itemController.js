const async = require("async");
const { body, param, validationResult } = require("express-validator");
const Item = require("../models/item");
const Category = require("../models/category");
const Order = require("../models/order");
const InventoryCount = require("../models/inventoryCount");

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

exports.item_detail = [
  param("id").isMongoId().withMessage("Item not found").escape(),
  function itemDetail(req, res, next) {
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render("itemDetail", {
        errors,
      });
    }
    Item.findById(req.params.id)
      .populate("category")
      .exec((err, item) => {
        if (err) {
          return next(err);
        }
        if (item === null) {
          const notFoundError = new Error("Item not found");
          notFoundError.status = 404;
          return next(notFoundError);
        }
        return res.render("itemDetail", { item });
      });
  },
];

exports.item_create_get = function itemCreateGet(req, res, next) {
  Category.find({}).exec((err, categories) => {
    if (err) {
      return next(err);
    }
    return res.render("itemForm", { title: "Create New Item", categories });
  });
};

exports.item_create_post = [
  body("name", "Item name required").trim().isLength({ min: 1 }).escape(),
  body("description").escape(),
  body("sku").escape(),
  body("price").escape(),
  body("quantityInStock").escape(),
  body("category").escape(),
  body("itemLastUpdated").escape(),

  (req, res, next) => {
    const { errors } = validationResult(req);

    const item = new Item({
      name: req.body.name,
      description: req.body.description,
      sku: req.body.sku || undefined,
      price: req.body.price || undefined,
      quantityInStock: req.body.quantityInStock || 0,
      category: req.body.category || undefined,
    });

    // If there are errors, re-render the form with the errors
    if (errors.length > 0) {
      // Get categories for the form
      Category.find({}).exec((err, categories) => {
        if (err) return next(err);
        // Render
        res.render("itemForm", {
          item,
          categories,
          title: "Create New Item",
          errors,
        });
      });
    } else {
      // Check whether the item name or sku already exists. If so, re-render with foundItem
      Item.findOne({
        $or: [{ name: req.body.name }, { sku: req.body.sku }],
      }).exec((err, foundItem) => {
        if (err) {
          return next(err);
        }
        if (foundItem) {
          Category.find({}).exec((categoryFindErr, categories) => {
            if (categoryFindErr) {
              return next(categoryFindErr);
            }
            res.render("itemForm", {
              item,
              categories,
              foundItem,
              title: "Create New Item",
            });
          });
        } else {
          // Given no errors and no duplicate exists, save item, create an initial count, and redirect
          async.parallel(
            {
              savedItem(callback) {
                item.save((itemSaveError) => {
                  if (itemSaveError) return next(itemSaveError);
                  callback(null, item);
                });
              },
              newCount(callback) {
                const count = new InventoryCount({
                  dateSubmitted: Date.now(),
                  countedQuantities: [
                    { item: item._id, quantity: item.quantityInStock },
                  ],
                  type: "Initial",
                });
                count.save((countSaveError) => {
                  if (countSaveError) return next(countSaveError);
                  callback(null, count);
                });
              },
            },
            (saveErrors, results) => {
              if (saveErrors) return next(saveErrors);
              res.redirect(results.savedItem.url);
            }
          );
        }
      });
    }
  },
];

// Remember to check whether quantityInStock has been updated, and if so, create an Initial count
// Remember to change qtyLastUpdated if quantityInStock changes

exports.item_update_get = [
  param("id").isMongoId().withMessage("Item not found").escape(),

  function itemUpdateGet(req, res, next) {
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render("itemForm", { title: "Update Item", errors });
    }

    const fetchItem = Item.findById(req.params.id).exec();
    const fetchCategories = Category.find({}).exec();

    Promise.all([fetchItem, fetchCategories])
      .catch((error) => next(error))
      .then(([item, categories]) => {
        if (item === null) {
          const notFoundError = new Error("Item not found");
          notFoundError.status = 404;
          return next(notFoundError);
        }
        return res.render("itemForm", {
          title: `Update Item: ${item.name}`,
          item,
          categories,
        });
      });
  },
];

exports.item_update_post = [
  body("name")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Item name required")
    .isLength({ max: 40 })
    .withMessage("Item name max of 40 characters exceeded")
    .escape(),
  body("description", "Description max of 256 characters exceeded")
    .optional({ checkFalsy: true })
    .isLength({ max: 256 })
    .escape(),
  body("sku", "SKU must be 24 characters or less")
    .optional({ checkFalsy: true })
    .isLength({ max: 24 })
    .escape(),
  body("price", "We could never charge that much!")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 9999999 }),
  body(
    "quantityInStock",
    "Quantity must be an integer between 0 and 9999999 (but it's inclusive at least!)"
  )
    .isInt({ min: 0, max: 9999999 })
    .toInt(),
  body("category").optional({ checkFalsy: true }),
  body(
    "itemLastUpdated",
    "ItemLastUpdated must be a valid date. (If you are seeing this as an end user, please report this error.)"
  ).toDate(),
  param("id").isMongoId().withMessage("Item not found").escape(),

  async function itemUpdatePost(req, res, next) {
    try {
      const { errors } = validationResult(req);
      // if the item Id from params is bad, handle before we try to fetch the item
      const paramErrors = errors.filter((error) => error.location === "params");
      if (paramErrors.length > 0) {
        return res.render("itemForm", {
          title: "Update Item",
          errors,
        });
      }

      const item = await Item.findById(req.params.id).exec();

      if (item === null) {
        const notFoundError = new Error("Item not found");
        notFoundError.status = 404;
        return next(notFoundError);
      }

      let newCount;
      if (item.quantityInStock !== req.body.quantityInStock) {
        item.qtyLastUpdated = Date.now();

        newCount = new InventoryCount({
          dateInitiated: Date.now(),
          dateSubmitted: Date.now(),
          countedQuantities: [
            { item: item._id, quantity: req.body.quantityInStock },
          ],
          type: "Ad Hoc",
        });
      }

      item.name = req.body.name;
      item.description = req.body.description;
      item.sku = req.body.sku;
      item.price = req.body.price;
      item.quantityInStock = req.body.quantityInStock;
      item.category = req.body.category;
      if (item.itemLastUpdated === null) item.itemLastUpdated = Date.now();

      if (errors.length > 0) {
        const categories = await Category.find({}).exec();
        return res.render("itemForm", {
          title: `Update Item: ${req.body.name}`,
          item,
          categories,
          errors,
        });
      }

      if (newCount) {
        await Promise.all([item.save(), newCount.save()]).catch((err) => {
          return next(err);
        });
      } else {
        await item.save();
      }

      return res.redirect(item.url);
    } catch (error) {
      return next(error);
    }
  },
];

exports.item_archive_get = [
  param("id").isMongoId().withMessage("Invalid item id").escape(),
  async function itemDeleteGet(req, res, next) {
    try {
      const { errors } = validationResult(req);
      if (errors.length > 0) {
        return res.render("itemArchive", { title: "Archive Item", errors });
      }

      const item = await Item.findById(req.params.id)
        .populate("category")
        .exec();
      if (item === null) {
        const notFoundError = new Error("Item not found");
        notFoundError.status = 404;
        return next(notFoundError);
      }

      return res.render("itemArchive", { title: "Archive Item", item });
    } catch (error) {
      return next(error);
    }
  },
];

exports.item_archive_post = [
  param("id").isMongoId().withMessage("Invalid item id").escape(),
  body("submitType").isIn(["archive", "restore"]).escape(),
  async function itemDeletePost(req, res, next) {
    try {
      const { errors } = validationResult(req);
      if (errors.length > 0) {
        return res.render("itemArchive", { title: "Archive Item", errors });
      }
      const item = await Item.findById(req.params.id).exec();
      if (item === null) {
        const notFoundError = new Error("Item not found");
        notFoundError.status = 404;
        return next(notFoundError);
      }
      const { submitType } = req.body;
      item.active = submitType === "restore";
      item.itemLastUpdated = Date.now();
      await item.save();
      return res.redirect(item.url);
    } catch (error) {
      return next(error);
    }
  },
];
