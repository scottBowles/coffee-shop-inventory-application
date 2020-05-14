const async = require("async");
const Receipt = require("../models/receipt");
const Order = require("../models/order");

exports.receiving_home = function receivingHome(req, res, next) {
  if (["all", "recent", undefined].includes(req.query.filter) === false) {
    res.redirect("/inventory/receiving");
  } else {
    async.parallel(
      {
        orders(callback) {
          Order.find({ status: "Ordered" })
            .sort({ deliveryDate: "descending" })
            .exec(callback);
        },
        receipts(callback) {
          if (req.query.filter === "all") {
            Receipt.find({})
              .sort({ submitted: "descending", dateInitiated: "descending" })
              .exec(callback);
          } else {
            Receipt.find({})
              .sort({ submitted: "descending", dateInitiated: "descending" })
              .limit(5)
              .exec(callback);
          }
        },
        filter(callback) {
          const filter = req.query.filter || "recent";
          callback(null, filter);
        },
      },
      (err, results) => {
        if (err) {
          return next(err);
        }
        res.render("receivingHome", {
          title: "Receiving",
          orders: results.orders,
          filter: results.filter,
          receipts: results.receipts,
        });
      }
    );
  }
};

exports.receipt_detail = function receiptDetail(req, res, next) {
  Receipt.findById(req.params.id)
    .populate({
      path: "receivedItems.item",
      select: "category name",
      populate: {
        path: "category",
        select: "name",
      },
    })
    .exec((err, receipt) => {
      if (err) {
        return next(err);
      }
      receipt.receivedItems.sort((a, b) => b.item.name - a.item.name);
      res.render("receiptDetail", { title: "Receipt", receipt });
    });
};

exports.receipt_create_get = function receiptCreateGet(req, res, next) {
  res.send("NOT IMPLEMENTED");
};

exports.receipt_create_post = function receiptCreatePost(req, res, next) {
  res.send("NOT IMPLEMENTED");
};

exports.receipt_update_get = function receiptUpdateGet(req, res, next) {
  res.send("NOT IMPLEMENTED");
};

exports.receipt_update_post = function receiptUpdatePost(req, res, next) {
  res.send("NOT IMPLEMENTED");
};

exports.receipt_delete_get = function receiptDeleteGet(req, res, next) {
  res.send("NOT IMPLEMENTED");
};

exports.receipt_delete_post = function receiptDeletePost(req, res, next) {
  res.send("NOT IMPLEMENTED");
};
