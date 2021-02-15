const mongoose = require('mongoose');
const async = require('async');
const { validationResult } = require('express-validator');
const InventoryCount = require('../models/inventoryCount');
const Item = require('../models/item');
const Category = require('../models/category');
const validate = require('./validate');
const { NotFoundError } = require('./errors');
const {
  sortItemsByCategoryThenName,
  sortCountedQuantitiesBySkuThenName,
  arrayToObject,
  updateItemsWithCountedQuantities,
  filterItemsForCount,
} = require('./utils');

const COUNT_HOME_FILTERS = ['all', 'unsubmitted', 'recent'];

exports.count_home = function countHome(req, res, next) {
  if (![...COUNT_HOME_FILTERS, undefined].includes(req.query.filter)) {
    res.redirect('/inventory/counts');
  } else {
    async.auto(
      {
        filter(cb) {
          const sanitizedFilter = COUNT_HOME_FILTERS.includes(req.query.filter)
            ? req.query.filter
            : 'recent';
          cb(null, sanitizedFilter);
        },
        counts: [
          'filter',
          ({ filter }, cb) => {
            if (filter === 'all') {
              InventoryCount.find({}).sort('-dateInitiated').exec(cb);
            } else if (filter === 'recent') {
              InventoryCount.find({}).sort('-dateInitiated').limit(5).exec(cb);
            } else {
              InventoryCount.find({ dateSubmitted: undefined })
                .sort('-dateInitiated')
                .exec(cb);
            }
          },
        ],
      },
      (err, { filter, counts }) => {
        if (err) return next(err);

        res.render('countsHome', {
          title: 'Inventory Counts',
          filter,
          counts,
        });
      }
    );
  }
};

exports.count_detail_get = [
  validate.id({ message: 'Invalid count id' }),
  function countDetailGet(req, res, next) {
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render('countDetail', { title: 'Count Detail', errors });
    }

    InventoryCount.findById(req.params.id)
      .populate({
        path: 'countedQuantities.item',
        populate: { path: 'category', select: 'name' },
      })
      .exec((err, count) => {
        if (err) return next(err);
        if (count === null) {
          return next(NotFoundError('Inventory Count not found'));
        }

        count.countedQuantities.sort(sortCountedQuantitiesBySkuThenName);

        return res.render('countDetail', { title: 'Count Detail', count });
      });
  },
];

exports.count_detail_post = [
  validate.id({ message: 'Invalid count id' }),

  async function countDetailPost(req, res, next) {
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render('countDetail', { title: 'Count Detail', errors });
    }

    const count = await InventoryCount.findById(req.params.id)
      .populate({
        path: 'countedQuantities.item',
        populate: { path: 'category', select: 'name' },
      })
      .exec();

    if (count === null) return next(NotFoundError('Inventory Count not found'));

    if (count.submitted) {
      return res.render('countDetail', {
        title: 'Count Detail',
        count,
        errors: [{ msg: 'Cannot update a submitted count' }],
      });
    }

    count.dateSubmitted = Date.now();
    await count.save().catch((err) => next(err));
    return res.redirect(count.url);
  },
];

exports.count_create_get = async function countCreateGet(req, res, next) {
  const { filter } = req.query || undefined;

  const [items, categories] = await Promise.all([
    Item.find({ active: true }, 'name description category sku quantityInStock')
      .populate('category', 'name')
      .exec(),
    Category.find({}, 'name').exec(),
  ]).catch((err) => next(err));

  const filteredItems = filterItemsForCount(filter, items).sort(
    sortItemsByCategoryThenName
  );

  res.render('countForm', {
    title: 'Create New Count',
    items: filteredItems,
    categories,
    filter,
  });
};

exports.count_create_post = [
  /* remove empty items */
  function removeEmptyItems(req, res, next) {
    req.body.items = req.body.items.filter((item) => item.quantity !== '');
    next();
  },

  /* validate and sanitize input */
  validate.countInput(),
  validate.submitType('submitButton', ['submit', 'save']),
  validate.password(),

  async function createPost(req, res, next) {
    /* grab errors and filter */
    const { errors } = validationResult(req);
    const { filter } = req.body;

    /* create new Count */
    const count = new InventoryCount({
      dateInitiated: Date.now(),
      dateSubmitted:
        req.body.submitButton === 'submit' ? Date.now() : undefined,
      countedQuantities: req.body.items.map((item) => ({
        item: mongoose.Types.ObjectId(item.id),
        quantity: item.quantity,
      })),
      type:
        filter === 'Full'
          ? 'Full'
          : filter === 'AdHoc'
          ? 'Ad Hoc'
          : 'By Category',
    });

    /* errors? rerender with items modified by count */
    if (errors.length > 0) {
      const items = await Item.find({}).populate('category', 'name').exec();
      const filteredItems = filterItemsForCount(filter, items);
      const itemsModifiedByCount = updateItemsWithCountedQuantities(
        filteredItems,
        count.countedQuantities
      ).sort(sortItemsByCategoryThenName);

      return res.render('countForm', {
        title: 'Create New Count',
        items: itemsModifiedByCount,
        count,
        filter,
        errors,
      });
    }

    /* no errors: save count. if submitting, update all of the items in count. if saving, save count alone. */
    if (req.body.submitButton === 'submit') {
      /* save count, update each item whose quantity was changed */
      await Promise.all([
        count.save(),
        ...count.countedQuantities.map(async (qty) => {
          const item = await Item.findById(qty.item, 'quantityInStock').exec();
          if (item.quantityInStock !== qty.quantity) {
            item.quantityInStock = qty.quantity;
            item.qtyLastUpdated = Date.now();
            return item.save();
          }
          return item;
        }),
      ])
        .then((savedDocs) => {
          /* once db updates succeed, redirect to newly created count */
          const savedCount = savedDocs[0];
          res.redirect(savedCount.url);
        })
        .catch((err) => next(err));
    } else {
      /* req.body.submit === "save" -- save count only */
      count
        .save()
        .catch((err) => next(err))
        .then((savedCount) => res.redirect(savedCount.url));
    }
  },
];

exports.count_update_get = [
  validate.id({ message: 'Invalid count id' }),

  async function countUpdateGet(req, res, next) {
    /* Handle validation errors */
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render('countForm', { title: 'Update Count', errors });
    }

    /* Get count, handle errors, and sort counted quantities */
    const count = await InventoryCount.findById(req.params.id)
      .populate({
        path: 'countedQuantities.item',
        select: 'name quantityInStock sku category',
        populate: { path: 'category', select: 'name' },
      })
      .exec();

    if (count === null) return next(NotFoundError('Inventory Count not found'));
    count.countedQuantities.sort(sortCountedQuantitiesBySkuThenName);

    /* Get appropriate filter string for the count type */
    const filter =
      count.type === 'Full'
        ? 'Full'
        : count.type === 'Ad Hoc'
        ? 'AdHoc'
        : 'By Category';

    /* If count has been submitted, render detail page with error -- cannot update */
    if (count.submitted) {
      return res.render('countDetail', {
        title: 'Count Detail',
        count,
        filter,
        errors: [{ msg: 'Cannot update a submitted count' }],
      });
    }

    /* Get an object of counted items mapping ids to quantities */
    const countedQtyIdsToQuantities = arrayToObject(
      count.countedQuantities,
      (item) => item.item._id.toString(),
      (item) => item.quantity
    );

    /* Construct query filter for category counts */
    const countCategory = ['Full', 'Ad Hoc'].includes(count.type)
      ? undefined
      : count.countedQuantities[0].item.category._id;

    const queryFilter = countCategory ? { category: countCategory } : {};

    /* Get items */
    const items = await Item.find(
      queryFilter,
      'name sku category quantityInStock'
    )
      .populate('category', 'name')
      .exec()
      .catch((err) => next(err));

    /**
     * Get all items that are active and/or were updated in the count.
     * If the count updated an inactive item, we still want to be able to update that.
     */
    const activeOrCountItemsMatchingCountType = items.filter(
      (item) => item.active || countedQtyIdsToQuantities[item._id] !== undefined
    );

    /* Take the filtered items and update quantities to match the saved count */
    const itemsWithQuantitiesUpdatedBySavedCount = updateItemsWithCountedQuantities(
      activeOrCountItemsMatchingCountType,
      count.countedQuantities
    ).sort(sortItemsByCategoryThenName);

    return res.render('countForm', {
      title: 'Update Count',
      items: itemsWithQuantitiesUpdatedBySavedCount,
      count,
      filter,
    });
  },
];

exports.count_update_post = [
  /* remove empty items */
  function removeEmptyItems(req, res, next) {
    req.body.items = req.body.items.filter((item) => item.quantity !== '');
    next();
  },

  /* validate and sanitize input */
  validate.countInput(),
  validate.submitType('submitButton', ['submit', 'save']),
  validate.id({ message: 'Invalid count id' }),
  validate.password(),

  async function updatePost(req, res, next) {
    /* grab errors & filter */
    const { errors } = validationResult(req);
    const { filter } = req.body;
    console.log({ filter });

    /* if the countId from params is bad, handle before we try to fetch the count */
    const paramErrors = errors.filter((error) => error.location === 'params');
    if (paramErrors.length > 0) {
      return res.render('countForm', { title: 'Update Count', errors });
    }

    /* fetch count && handle errors */
    const count = await InventoryCount.findById(req.params.id)
      .populate({
        path: 'countedQuantities.item',
        select: 'name sku quantityInStock category',
        populate: { path: 'category', select: 'name' },
      })
      .exec();

    if (count === null) return next(NotFoundError('Inventory Count not found'));

    /* define category if a category count */
    const categoryId =
      filter === 'By Category' && count.countedQuantities[0].item.category
        ? count.countedQuantities[0].item.category._id
        : undefined;

    /* update count with input data */
    count.countedQuantities = req.body.items.map((item) => ({
      item: mongoose.Types.ObjectId(item.id),
      quantity: item.quantity,
    }));

    /* if count has already been submitted, render with error message */
    if (count.submitted) {
      return res.render('countDetail', {
        title: 'Count Detail',
        count,
        error: 'Cannot update a submitted count',
      });
    }

    /* validation errors? rerender with items modified by count */
    if (errors.length > 0) {
      const queryFilter = categoryId ? { category: categoryId } : {};

      const items = await Item.find(
        queryFilter,
        'name sku category quantityInStock'
      )
        .populate('category', 'name')
        .exec();

      /* Update items with input quantities and sort */
      const itemsModifiedByCount = updateItemsWithCountedQuantities(
        items,
        count.countedQuantities
      ).sort(sortItemsByCategoryThenName);

      return res.render('countForm', {
        title: 'Update Count',
        items: itemsModifiedByCount,
        count,
        filter,
        errors,
      });
    }

    // no errors: save count. if submitting, update all of the items in count. if saving, save count alone.
    if (req.body.submitButton === 'submit') {
      // save count, update each item whose quantity was changed
      return Promise.all([
        count.countedQuantities.map(async (qty) => {
          const item = await Item.findById(qty.item, 'quantityInStock').exec();
          if (item.quantityInStock !== qty.quantity) {
            item.quantityInStock = qty.quantity;
            item.qtyLastUpdated = Date.now();
            return item.save();
          }
          return item;
        }),
      ])
        .then(async () => {
          count.dateSubmitted = Date.now();
          const savedCount = await count.save();
          res.redirect(savedCount.url);
        })
        .catch((err) => next(err));
    }

    // req.body.submit === "save" -- save count only
    return count
      .save()
      .catch((err) => next(err))
      .then((savedCount) => res.redirect(savedCount.url));
  },
];

exports.count_delete_get = [
  validate.id({ message: 'Invalid count id' }),

  async function countDeleteGet(req, res, next) {
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render('countDelete', {
        title: 'Remove Inventory Count',
        errors,
      });
    }
    try {
      const { id } = req.params;
      const count = await InventoryCount.findById(id)
        .populate({
          path: 'countedQuantities.item',
          select: 'name sku category quantityInStock',
          populate: { path: 'category', select: 'name' },
        })
        .exec();

      if (count === null) {
        return next(NotFoundError('Inventory Count not found'));
      }

      count.countedQuantities.sort(sortCountedQuantitiesBySkuThenName);

      return res.render('countDelete', {
        title: 'Remove Inventory Count',
        count,
      });
    } catch (error) {
      return next(error);
    }
  },
];

exports.count_delete_post = [
  validate.password(),
  validate.id({ message: 'Invalid count id' }),

  async function countDeletePost(req, res, next) {
    const { errors } = validationResult(req);

    if (errors.length > 0) {
      try {
        const { id } = req.params;
        const count = await InventoryCount.findById(id)
          .populate({
            path: 'countedQuantities.item',
            select: 'name sku category quantityInStock',
            populate: { path: 'category', select: 'name' },
          })
          .exec();

        if (count === null) {
          return next(NotFoundError('Inventory Count not found'));
        }

        count.countedQuantities.sort(sortCountedQuantitiesBySkuThenName);

        return res.render('countDelete', {
          title: 'Remove Inventory Count',
          count,
          errors,
        });
      } catch (error) {
        return next(error);
      }
    }

    // no errors -- delete count and redirect to counts home
    try {
      const count = await InventoryCount.findByIdAndRemove(
        req.params.id
      ).exec();

      if (count === null) {
        return next(NotFoundError('Inventory Count not found'));
      }

      return res.redirect('/inventory/counts');
    } catch (error) {
      return next(error);
    }
  },
];
