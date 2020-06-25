const async = require("async");
const validator = require("express-validator");
const InventoryCount = require("../models/inventoryCount");
const Item = require("../models/item");
const Category = require("../models/category");

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

exports.count_create_post = function (req, res, next) {
  console.log(JSON.stringify(req.body));
  res.send({ status: "success" });
};
// [
//   // validate and sanitize input

//   function countCreatePost(req, res, next) {
//     // grab errors
//     const errors = validator.validationResult(req);
//     // create new Count
//     const count = new InventoryCount({
//       dateInitiated: req.body.dateInitiated,
//       dateSubmitted: req.body.dateSubmitted || undefined,
//       countedQuantities: req.body.countedQuantities,
//       type: req.body.dateSubmitted,
//     });
//     // errors? rerender with items modified by count
//     if (!errors.isEmpty()) {
//       // rerender with items modified by count
//     }
//     // save count

//     // update all of the items in count
//   },
// ];

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
