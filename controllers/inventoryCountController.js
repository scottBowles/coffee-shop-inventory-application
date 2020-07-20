const mongoose = require("mongoose");
const async = require("async");
const { body, param, validationResult } = require("express-validator");
const InventoryCount = require("../models/inventoryCount");
const Item = require("../models/item");
const Category = require("../models/category");

exports.count_home = function countHome(req, res, next) {
  if (!["all", "unsubmitted", "recent", undefined].includes(req.query.filter)) {
    res.redirect("/inventory/counts");
  } else {
    async.auto(
      {
        countsFilter(callback) {
          const { filter } = req.query;
          const filterSanitized = filter || "recent";
          callback(null, filterSanitized);
        },
        counts: [
          "countsFilter",
          (results, callback) => {
            const { countsFilter } = results;
            if (countsFilter === "all") {
              InventoryCount.find({})
                .sort({ dateInitiated: "descending" })
                .exec(callback);
            } else if (countsFilter === "recent") {
              InventoryCount.find({})
                .sort({ dateInitiated: "descending" })
                .limit(5)
                .exec(callback);
            } else {
              InventoryCount.find({ dateSubmitted: undefined })
                .sort({ dateInitiated: "descending" })
                .exec(callback);
            }
          },
        ],
      },
      (err, results) => {
        if (err) {
          return next(err);
        }
        res.render("countsHome", {
          title: "Inventory Counts",
          filter: results.countsFilter,
          counts: results.counts,
        });
      }
    );
  }
};

exports.count_detail_get = function countDetailGet(req, res, next) {
  InventoryCount.findById(req.params.id)
    .populate({
      path: "countedQuantities.item",
      populate: "category",
    })
    .exec((err, count) => {
      if (err) {
        return next(err);
      }
      count.countedQuantities.sort((a, b) => {
        if (a.item.sku !== b.item.sku) {
          return a.item.sku > b.item.sku ? 1 : -1;
        }
        return a.item.name > b.item.name ? 1 : -1;
      });
      res.render("countDetail", { title: "Count Detail", count });
    });
};

exports.count_detail_post = async function countDetailPost(req, res, next) {
  const count = await InventoryCount.findById(req.params.id)
    .populate({ path: "countedQuantities.item", populate: "category" })
    .exec();
  console.log({ count });
  if (count.submitted) {
    res.render("countDetail", {
      title: "Count Detail",
      count,
      error: "Cannot update a submitted count",
    });
    return;
  }
  count.dateSubmitted = Date.now();
  await count.save().catch((err) => next(err));

  res.redirect(count.url);
};

exports.count_create_get = async function countCreateGet(req, res, next) {
  const { filter } = req.query || undefined;
  const fetchItems = Item.find(
    {},
    "name description category sku quantityInStock"
  )
    .populate("category")
    .exec();

  const fetchCategories = Category.find({}, "name").exec();

  const [items, categories] = await Promise.all([
    fetchItems,
    fetchCategories,
  ]).catch((err) => next(err));

  const filteredItems =
    filter === "Full" || filter === "AdHoc"
      ? items
      : items.filter((item) => item.category && item.category.name === filter);

  filteredItems.sort((item1, item2) =>
    item1.name.toLowerCase() > item2.name.toLowerCase() ? 1 : -1
  );

  res.render("countForm", {
    title: "Create New Count",
    items: filteredItems,
    categories,
    filter,
  });
};

exports.count_create_post = [
  // remove empty items
  function removeEmptyItems(req, res, next) {
    req.body.items = req.body.items.filter((item) => item.quantity !== "");
    next();
  },

  // validate and sanitize input
  body("items.*.id").escape(),
  body("items.*.quantity").isInt({ lt: 10000000 }).escape(),
  body("filter").escape(),
  body("submitButton").isIn(["submit", "save"]).escape(),

  async function createPost(req, res, next) {
    // grab errors
    const { errors } = validationResult(req);

    // create new Count
    const { filter } = req.body || undefined;

    const newCount = {
      dateInitiated: Date.now(),
      dateSubmitted:
        req.body.submitButton === "submit" ? Date.now() : undefined,
      countedQuantities: req.body.items.map((item) => {
        return {
          item: mongoose.Types.ObjectId(item.id),
          quantity: item.quantity,
        };
      }),
      type:
        filter === "Full"
          ? "Full"
          : filter === "AdHoc"
          ? "Ad Hoc"
          : "By Category",
    };

    const count = new InventoryCount(newCount);

    // errors? rerender with items modified by count
    if (errors.length > 0) {
      const items = await Item.find({}).populate("category").exec();

      const filteredItems =
        filter === "Full" || filter === "AdHoc"
          ? items
          : items.filter((item) => item.category.name === filter);

      const countHash = {};
      count.countedQuantities.forEach((countItem) => {
        const id = countItem.item.toString();
        countHash[id] = countItem.quantity;
      });

      const itemsModifiedByCount = [];

      filteredItems.forEach((item) => {
        const newItem = item;
        newItem.quantityInStock =
          countHash[newItem._id.toString()] || item.quantityInStock;
        itemsModifiedByCount.push(newItem);
      });

      itemsModifiedByCount.sort((item1, item2) =>
        item1.name.toLowerCase() > item2.name.toLowerCase() ? 1 : -1
      );

      res.render("countForm", {
        title: "Create New Count",
        items: itemsModifiedByCount,
        count,
        filter,
        errors,
      });
    } else {
      // no errors: save count. if submitting, update all of the items in count. if saving, save count alone.

      // eslint-disable-next-line no-lonely-if
      if (req.body.submitButton === "submit") {
        // save count, update each item whose quantity was changed
        await Promise.all([
          count.save(),
          ...count.countedQuantities.map(async (qty) => {
            const item = await Item.findById(qty.item).exec();
            if (item.quantityInStock !== qty.quantity) {
              item.quantityInStock = qty.quantity;
              item.qtyLastUpdated = Date.now();
              return item.save();
            }
            return item;
          }),
        ])
          .then((savedDocs) => {
            const savedCount = savedDocs[0];
            res.redirect(savedCount.url);
          })
          .catch((err) => next(err));
      } else {
        // req.body.submit === "save" -- save count only
        count
          .save()
          .catch((err) => next(err))
          .then((savedCount) => res.redirect(savedCount.url));
      }
    }
  },
];

exports.count_update_get = async function countUpdateGet(req, res, next) {
  const count = await InventoryCount.findById(req.params.id)
    .populate({
      path: "countedQuantities.item",
      populate: "category",
    })
    .exec();

  count.countedQuantities.sort((a, b) => {
    if (a.item.sku !== b.item.sku) {
      return a.item.sku > b.item.sku ? 1 : -1;
    }
    return a.item.name > b.item.name ? 1 : -1;
  });

  // Only matters here whether "By Category" or not, but this gives consistency to the front end & for POST
  const filter =
    // eslint-disable-next-line no-nested-ternary
    count.type === "Full"
      ? "Full"
      : count.type === "Ad Hoc"
      ? "AdHoc"
      : "By Category";

  if (count.submitted) {
    res.render("countDetail", {
      title: "Count Detail",
      count,
      filter,
      error: "Cannot update a submitted count",
    });
  }

  const items = await Item.find({})
    .populate("category")
    .exec()
    .catch((err) => next(err));

  // If category count, grab the category from the first item in the count and filter accordingly
  const filteredItems =
    filter === "Full" || filter === "AdHoc"
      ? items
      : items.filter(
          (item) =>
            item.category.name === count.countedQuantities[0].item.category.name
        );

  const countHash = {};

  count.countedQuantities.forEach((countItem) => {
    const id = countItem.item._id.toString();
    countHash[id] = countItem.quantity;
  });

  const itemsModifiedByCount = [];

  filteredItems.forEach((item) => {
    const newItem = item;
    newItem.quantityInStock =
      countHash[newItem._id.toString()] || item.quantityInStock;
    itemsModifiedByCount.push(newItem);
  });

  itemsModifiedByCount.sort((item1, item2) =>
    item1.name.toLowerCase() > item2.name.toLowerCase() ? 1 : -1
  );

  res.render("countForm", {
    title: "Update Count",
    items: itemsModifiedByCount,
    count,
    filter,
  });
};

exports.count_update_post = [
  // remove empty items
  function removeEmptyItems(req, res, next) {
    req.body.items = req.body.items.filter((item) => item.quantity !== "");
    next();
  },

  // validate and sanitize input
  body("items.*.id").escape(),
  body("items.*.quantity").isInt({ lt: 10000000 }).escape(),
  body("filter").escape(),
  body("submitButton").isIn(["submit", "save"]).escape(),

  async function updatePost(req, res, next) {
    // grab errors & filter
    const { errors } = validationResult(req);
    const { filter } = req.body;

    // fetch count
    const count = await InventoryCount.findById(req.params.id)
      .populate({
        path: "countedQuantities.item",
        populate: "category",
      })
      .exec();

    // if count has already been submitted, render with error message
    if (count.submitted) {
      if (count.submitted) {
        res.render("countDetail", {
          title: "Count Detail",
          count,
          error: "Cannot update a submitted count",
        });
      }
    }

    // define category if a category count
    const category =
      filter === "By Category"
        ? count.countedQuantities[0].item.category._id
        : undefined;

    // update count with input data
    const newCountedQuantities = req.body.items.map((item) => {
      return {
        item: mongoose.Types.ObjectId(item.id),
        quantity: item.quantity,
      };
    });

    count.countedQuantities = newCountedQuantities;

    // errors? rerender with items modified by count
    if (errors.length > 0) {
      const items = await Item.find({}).populate("category").exec();

      // console.log({ items });

      const filteredItems = category
        ? items
        : items.filter((item) => item.category._id === category);

      const countHash = {};
      count.countedQuantities.forEach((countItem) => {
        const id = countItem.item.toString();
        countHash[id] = countItem.quantity;
      });

      const itemsModifiedByCount = [];
      filteredItems.forEach((item) => {
        const newItem = item;
        newItem.quantityInStock =
          countHash[newItem._id.toString()] || item.quantityInStock;
        itemsModifiedByCount.push(newItem);
      });

      itemsModifiedByCount.sort((item1, item2) =>
        item1.name.toLowerCase() > item2.name.toLowerCase() ? 1 : -1
      );

      res.render("countForm", {
        title: "Update Count",
        items: itemsModifiedByCount,
        count,
        filter,
        errors,
      });
    } else {
      // no errors: save count. if submitting, update all of the items in count. if saving, save count alone.

      // eslint-disable-next-line no-lonely-if
      if (req.body.submitButton === "submit") {
        // save count, update each item whose quantity was changed
        await Promise.all([
          count.countedQuantities.map(async (qty) => {
            const item = await Item.findById(qty.item).exec();
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
      } else {
        // req.body.submit === "save" -- save count only
        count
          .save()
          .catch((err) => next(err))
          .then((savedCount) => res.redirect(savedCount.url));
      }
    }
  },
];

exports.count_delete_get = async function countDeleteGet(req, res, next) {
  const { id } = req.params;
  try {
    const count = await InventoryCount.findById(id)
      .populate({
        path: "countedQuantities.item",
        populate: "category",
      })
      .exec();

    count.countedQuantities.sort((a, b) => {
      if (a.item.sku !== b.item.sku) {
        return a.item.sku > b.item.sku ? 1 : -1;
      }
      return a.item.name > b.item.name ? 1 : -1;
    });

    res.render("countDelete", { title: "Remove Inventory Count", count });
  } catch (error) {
    return next(error);
  }
};

exports.count_delete_post = async function countDeletePost(req, res, next) {
  try {
    await InventoryCount.findByIdAndRemove(req.params.id).exec();
    res.redirect("/inventory/counts");
  } catch (error) {
    return next(error);
  }
};
