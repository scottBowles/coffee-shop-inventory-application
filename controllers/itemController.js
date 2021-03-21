const async = require('async');
const fs = require('fs');
const { validationResult } = require('express-validator');
const Item = require('../models/item');
const Category = require('../models/category');
const Order = require('../models/order');
const InventoryCount = require('../models/inventoryCount');
const { uploadImage } = require('./utils');
const validate = require('./validate');

exports.item_home = function itemHome(req, res, next) {
  async.auto(
    {
      // Query category names
      categories(callback) {
        Category.find({}, 'name').sort({ name: 'ascending' }).exec(callback);
      },
      // If filter in category names or "Archived", pass filter. Otherwise pass "All" as the default filter.
      queryFilter: [
        'categories',
        (results, callback) => {
          const { filter } = req.query;
          const categoryNames = results.categories.map(
            (category) => category.name
          );
          const sanitizedFilter =
            categoryNames.includes(filter) || filter === 'Archived'
              ? filter
              : 'All';
          callback(null, sanitizedFilter);
        },
      ],
      // Find all items appropriate to filter
      items: [
        'queryFilter',
        'categories',
        (results, callback) => {
          const { categories, queryFilter } = results;
          if (queryFilter === 'Archived') {
            Item.find(
              { active: false },
              'name category sku quantityInStock active'
            )
              .populate('category', 'name')
              .exec(callback);
          } else if (queryFilter === 'All') {
            Item.find(
              { active: true },
              'name category sku quantityInStock active'
            )
              .sort({ sku: 'ascending', name: 'ascending' })
              .populate('category', 'name')
              .exec(callback);
          } else {
            const category = categories.find((cat) => cat.name === queryFilter);
            Item.find(
              { category: category._id, active: true },
              'name category sku quantityInStock active'
            )
              .sort({ sku: 'ascending', name: 'ascending' })
              .populate('category', 'name')
              .exec(callback);
          }
        },
      ],
      // Find quantities on order for each item to be displayed
      orderedQuantities: [
        'items',
        (results, callback) => {
          const { items } = results;
          Order.find({ status: 'Ordered' }, 'orderedItems').exec(
            (err, orders) => {
              if (err) {
                return next(err);
              }
              const quantities = {};
              items.forEach((item) => {
                const itemQty = orders.reduce((total, order) => {
                  const itemInOrder = order.orderedItems.find((orderedItem) =>
                    item._id.equals(orderedItem.item)
                  );
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
      // sort items by sku, then by category, then by name
      results.items.sort((a, b) => {
        const aCatName = a.category ? a.category.name : '(None)';
        const bCatName = b.category ? b.category.name : '(None)';
        if (aCatName === bCatName) {
          if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
          return -1;
        }
        if (aCatName > bCatName) return 1;
        return -1;
      });
      // Render item home page with the gathered results
      res.render('itemsHome', {
        title: 'Items',
        orderedQty: results.orderedQuantities,
        items: results.items,
        categories: results.categories,
        filter: results.queryFilter,
      });
    }
  );
};

exports.item_detail = [
  validate.id({ message: 'Item not found' }),
  function itemDetail(req, res, next) {
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render('itemDetail', {
        errors,
      });
    }
    Item.findById(req.params.id)
      .populate('category', 'name')
      .exec((err, item) => {
        if (err) {
          return next(err);
        }
        if (item === null) {
          const notFoundError = new Error('Item not found');
          notFoundError.status = 404;
          return next(notFoundError);
        }
        return res.render('itemDetail', { item });
      });
  },
];

exports.item_create_get = function itemCreateGet(req, res, next) {
  Category.find({}, 'name').exec((err, categories) => {
    if (err) {
      return next(err);
    }
    return res.render('itemForm', { title: 'Create New Item', categories });
  });
};

exports.item_create_post = [
  uploadImage,
  validate.item(),
  validate.password(),

  (req, res, next) => {
    const { errors } = validationResult(req);

    const item = new Item({
      name: req.body.name,
      description: req.body.description,
      sku: req.body.sku || 'Not marked for sale',
      price: req.body.price || undefined,
      quantityInStock: req.body.quantityInStock || 0,
      category: req.body.category || undefined,
      image:
        req.file === undefined
          ? undefined
          : {
              data: fs.readFileSync(req.file.path),
              contentType: req.file.mimetype,
            },
    });

    // If there are errors, re-render the form with the errors
    if (errors.length > 0) {
      // Get categories for the form
      Category.find({}, 'name').exec((err, categories) => {
        if (err) return next(err);
        // Render
        res.render('itemForm', {
          item,
          categories,
          title: 'Create New Item',
          errors,
        });
      });
    } else {
      // Check whether the item name or sku already exists. If so, re-render with foundItem
      Item.find()
        .or([{ name: item.name }, { sku: item.sku }])
        .exec((err, foundItems) => {
          if (err) {
            return next(err);
          }
          // Make sure that, if the name isn't a match but the sku is, the sku isn't just the default

          const foundItemArray = foundItems.filter(
            (fItem) =>
              !fItem._id.equals(item._id) &&
              (fItem.name === item.name ||
                (fItem.sku === item.sku && fItem.sku !== 'Not marked for sale'))
          );

          const foundItem = foundItemArray[0];
          if (foundItem) {
            Category.find({}, 'name').exec((categoryFindErr, categories) => {
              if (categoryFindErr) {
                return next(categoryFindErr);
              }
              res.render('itemForm', {
                item,
                categories,
                foundItem,
                title: 'Create New Item',
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
                    type: 'Initial',
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
  validate.id({ message: 'Item not found' }),

  function itemUpdateGet(req, res, next) {
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render('itemForm', { title: 'Update Item', errors });
    }

    const fetchItem = Item.findById(req.params.id).exec();
    const fetchCategories = Category.find({}, 'name').exec();

    Promise.all([fetchItem, fetchCategories])
      .catch((error) => next(error))
      .then(([item, categories]) => {
        if (item === null) {
          const notFoundError = new Error('Item not found');
          notFoundError.status = 404;
          return next(notFoundError);
        }
        return res.render('itemForm', {
          title: `Update Item: ${item.name}`,
          item,
          categories,
        });
      });
  },
];

exports.item_update_post = [
  uploadImage,
  validate.item(),
  validate.password(),
  validate.id({ message: 'Item not found' }),

  async function itemUpdatePost(req, res, next) {
    try {
      const { errors } = validationResult(req);
      // if the item Id from params is bad, handle before we try to fetch the item
      const paramErrors = errors.filter((error) => error.location === 'params');
      if (paramErrors.length > 0) {
        return res.render('itemForm', {
          title: 'Update Item',
          errors,
        });
      }

      const item = await Item.findById(req.params.id).exec();

      if (item === null) {
        const notFoundError = new Error('Item not found');
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
          type: 'Ad Hoc',
        });
      }

      item.name = req.body.name;
      item.description = req.body.description;
      item.sku = req.body.sku || undefined;
      item.price = req.body.price;
      item.quantityInStock = req.body.quantityInStock;
      item.category = req.body.category;
      item.image =
        req.file === undefined
          ? item.image
          : {
              data: fs.readFileSync(req.file.path),
              contentType: req.file.mimetype,
            };

      if (item.itemLastUpdated === null) item.itemLastUpdated = Date.now();

      if (errors.length > 0) {
        const categories = await Category.find({}, 'name').exec();
        return res.render('itemForm', {
          title: `Update Item: ${req.body.name}`,
          item,
          categories,
          errors,
        });
      }

      // Check whether the item name or sku already exists. If so, re-render with foundItem
      const foundItems = await Item.find()
        .or([{ name: item.name }, { sku: item.sku }])
        .exec()
        .catch((err) => next(err));

      const foundItemArray = foundItems.filter(
        (fItem) =>
          !fItem._id.equals(item._id) &&
          (fItem.name === item.name ||
            (fItem.sku === item.sku && fItem.sku !== 'Not marked for sale'))
      );

      const foundItem = foundItemArray[0];
      if (foundItem) {
        const categories = await Category.find({}, 'name')
          .exec()
          .catch((err) => next(err));
        res.render('itemForm', {
          item,
          categories,
          foundItem,
          title: 'Create New Item',
        });
      }

      item.itemLastUpdated = Date.now();

      if (newCount) {
        await Promise.all([item.save(), newCount.save()]).catch((err) =>
          next(err)
        );
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
  validate.id({ message: 'Invalid item id' }),
  async function itemDeleteGet(req, res, next) {
    try {
      const { errors } = validationResult(req);
      if (errors.length > 0) {
        return res.render('itemArchive', { title: 'Archive Item', errors });
      }

      const item = await Item.findById(req.params.id)
        .populate('category', 'name')
        .exec();
      if (item === null) {
        const notFoundError = new Error('Item not found');
        notFoundError.status = 404;
        return next(notFoundError);
      }

      return res.render('itemArchive', { title: 'Archive Item', item });
    } catch (error) {
      return next(error);
    }
  },
];

exports.item_archive_post = [
  validate.id({ message: 'Invalid item id' }),
  validate.submitType('submitType', ['archive', 'restore']),
  validate.password(),

  async function itemDeletePost(req, res, next) {
    try {
      const { errors } = validationResult(req);
      const item = await Item.findById(req.params.id).exec();

      if (errors.length > 0) {
        return res.render('itemArchive', {
          title: 'Archive Item',
          item,
          errors,
        });
      }

      if (item === null) {
        const notFoundError = new Error('Item not found');
        notFoundError.status = 404;
        return next(notFoundError);
      }

      const { submitType } = req.body;
      item.active = submitType === 'restore';
      item.itemLastUpdated = Date.now();
      await item.save();
      return res.redirect(item.url);
    } catch (error) {
      return next(error);
    }
  },
];
