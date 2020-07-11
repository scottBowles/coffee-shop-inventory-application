const mongoose = require("mongoose");
const async = require("async");
const validator = require("express-validator");
const InventoryCount = require("../models/inventoryCount");
const Item = require("../models/item");
const Category = require("../models/category");
const { render } = require("pug");

exports.count_home = function countHome(req, res, next) {
  if (
    ["all", "unsubmitted", "recent", undefined].includes(req.query.filter) ===
    false
  ) {
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

exports.count_detail = function countDetail(req, res, next) {
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
      : items.filter((item) => item.category.name === filter);

  res.render("countForm", {
    title: "Create New Count",
    items: filteredItems,
    categories,
    filter,
  });
};

exports.count_create_post = [
  // For testing
  // function testCreatePostData(req, res, next) {
  //   console.log({
  //     items: req.body.items,
  //     id: typeof req.body.items[0].id,
  //     quantity: typeof req.body.items[0].quantity,
  //   });
  //   res.send({ status: "success" });
  // },
  // remove empty items
  function removeEmptyItems(req, res, next) {
    req.body.items = req.body.items.filter((item) => item.quantity !== null);
    next();
  },

  // validate and sanitize input
  validator.body("items.*.id").escape(),
  validator.body("items.*.quantity").isInt({ lt: 10000000 }).escape(),
  validator.body("filter").escape(),

  async function createPost(req, res, next) {
    // grab errors
    const errors = validator.validationResult(req);

    // create new Count
    const newCount = {};
    newCount.dateInitiated = Date.now();
    newCount.dateSubmitted =
      req.params.submitType === "submit" ? Date.now() : undefined;
    newCount.countedQuantities = req.body.items.map((item) => {
      return {
        item: mongoose.Types.ObjectId(item.id),
        quantity: item.quantity,
      };
    });
    const { filter } = req.body || undefined;
    if (filter === "Full") newCount.type = "Full";
    else if (filter === "AdHoc") newCount.type = "Ad Hoc";
    else newCount.type = "By Category";

    const count = new InventoryCount(newCount);

    // errors? rerender with items modified by count
    if (!errors.isEmpty()) {
      console.log({ errors });
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
          : items.filter((item) => item.category.name === filter);

      res.render("countForm", {
        title: "Create New Count",
        items: filteredItems,
        categories,
        count,
        filter,
        errors,
      });

      // res.json({
      //   action: "render",
      //   template: "countForm",
      //   props: {
      //     title: "Create New Count",
      //     items: filteredItems,
      //     categories,
      //     count,
      //     filter,
      //     errors,
      //   },
      // });
    } else {
      // save count & update all of the items in count
      const saveCount = count.save();

      const saveDocs = [saveCount];

      count.countedQuantities.forEach((qty) => {
        const newItem = new Item({
          _id: qty.item,
          quantityInStock: qty.quantity,
          qtyLastUpdated: Date.now(),
        });
        const saveItem = Item.findByIdAndUpdate(newItem._id, newItem).exec();
        saveDocs.push(saveItem);
      });

      const savedDocs = await Promise.all(saveDocs).catch((err) => next(err));

      const savedCount = await savedDocs[0];

      // return res.json({ action: "redirect", target: savedCount.url });

      return res.json({ redirect: savedCount.url });

      // VALIDATOR ERROR ROUTE NOT WORKING DUE TO AXIOS INTERACTION
      // && NEED TO GET SAVE BUTTON WORKING (PER req.params.submitType), FOR WHICH IT SHOULDN'T UPDATE ITEMS
    }
  },
];

function countCreatePost(req, res, next) {
  res.send("NOT IMPLEMENTED");
}

exports.count_update_get = function countUpdateGet(req, res, next) {
  res.send("NOT IMPLEMENTED");
};

exports.count_update_post = function countUpdatePost(req, res, next) {
  res.send("NOT IMPLEMENTED");
};

exports.count_delete_get = function countDeleteGet(req, res, next) {
  res.send("NOT IMPLEMENTED");
};

exports.count_delete_post = function countDeletePost(req, res, next) {
  res.send("NOT IMPLEMENTED");
};
