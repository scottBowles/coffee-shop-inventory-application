const async = require("async");
const InventoryCount = require("../models/inventoryCount");

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
  res.send(`NOT IMPLEMENTED: Inventory count detail: ${req.params.id}`);
};

exports.count_create_get = function countCreateGet(req, res, next) {
  res.send("NOT IMPLEMENTED");
};

exports.count_create_post = function countCreatePost(req, res, next) {
  res.send("NOT IMPLEMENTED");
};

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
