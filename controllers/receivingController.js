const async = require("async");
const { body, validationResult } = require("express-validator");
// const validator = require("express-validator");
const { mongoose } = require("mongoose");
const Receipt = require("../models/receipt");
const Order = require("../models/order");
const Item = require("../models/item");

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

exports.receipt_create_get = async function receiptCreateGet(req, res, next) {
  // get items
  const items = await Item.find({}, "name sku quantityInStock")
    .populate("category")
    .exec()
    .catch((err) => next(err));

  items.sort((a, b) => {
    if (a.category.name !== b.category.name) {
      return a.category.name.toLowerCase() > b.category.name.toLowerCase()
        ? 1
        : -1;
    }
    return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
  });

  // render receipt form
  res.render("receiptForm", { title: "Create New Receipt", items });
};

exports.receipt_create_post = [
  // USED BODY RATHER THAN VALIDATOR.BODY

  // validate/sanitize
  body("receivedItems.*.id").escape(),
  body("receivedItems.*.quantity").isInt({ lt: 10000000 }).escape(),
  body("submitType").isIn(["submit", "save"]).escape(),

  async function receiptCreatePostWinnow(req, res, next) {
    const { errors } = validationResult(req);
    const { receivedItems, submitType } = req.body;
    const orderId = req.params.order;

    /*
     *  Filter out items not on receipt
     *  Create hash { itemIds: qtiesReceived }
     *  Add to hash items present in order but zeroed in receipt,
     *      to preserve that these were ordered but not received.
     *  (The other items are duplicated in this step, not changing the hash.)
     */

    const receivedItemsFiltered = receivedItems.filter(
      (item) => !!item.quantity
    );

    const receivedItemHash = {};
    receivedItemsFiltered.forEach((item) => {
      receivedItemHash[item.id] = item.quantity;
    });

    if (orderId) {
      const order = await Order.findById(orderId).exec();
      order.orderedItems.forEach((orderedItem) => {
        receivedItemHash[orderedItem.item] =
          receivedItemHash[orderedItem.item] || "0";
      });
    }

    /*
     *  Make new Receipt
     */

    const newReceipt = new Receipt({
      dateSubmitted: submitType === "submit" ? Date.now() : undefined,
      receivedItems: Object.keys(receivedItemHash).map((key) => {
        return {
          item: mongoose.Types.ObjectId(key),
          quantity: receivedItemHash[key],
        };
      }),
      orderReceived: orderId ? mongoose.Types.ObjectId(orderId) : undefined,
    });

    /*
     *  Fetch Items
     */

    const items = await Item.find({}, "name sku quantityInStock").exec();

    /*
     *  If errors, rerender receiptForm with errors
     */
    if (errors.length > 0) {
      // get items
      items
        .populate("category")
        .execPopulate()
        .catch((err) => next(err));

      items.sort((a, b) => {
        if (a.category.name !== b.category.name) {
          return a.category.name.toLowerCase() > b.category.name.toLowerCase()
            ? 1
            : -1;
        }
        return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
      });

      // render receipt form
      res.render("receiptForm", { title: "Create New Receipt", items, errors });
    }
    // get items and amend them with added quantity
    // save receipt and items
    // redirect to receipt.url
  },
];

exports.receipt_update_get = async function receiptUpdateGet(req, res, next) {
  // promise receipt
  const fetchReceipt = Receipt.findById(req.params.id)
    .populate({
      path: "receivedItems.item",
      select: "category name",
      populate: {
        path: "category",
        select: "name",
      },
    })
    .exec();

  // promise items
  const fetchItems = Item.find({}, "name sku quantityInStock")
    .populate("category")
    .exec();

  // fetch in parallel
  const [receipt, items] = await Promise.all([
    fetchReceipt,
    fetchItems,
  ]).catch((err) => next(err));

  // if receipt has already been submitted, re-render detail page with error message
  if (receipt.submitted) {
    receipt.receivedItems.sort((a, b) => b.item.name - a.item.name);
    res.render("receiptDetail", {
      title: "Receipt",
      receipt,
      errors: [{ msg: "Cannot update a receipt once it has been submitted." }],
    });
    return;
  }

  items.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.name.toLowerCase() > b.category.name.toLowerCase()
        ? 1
        : -1;
    }
    return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
  });

  const thisReceiptItems = {};
  receipt.receivedItems.forEach((receivedItem) => {
    const id = receivedItem.item._id.toString();
    thisReceiptItems[id] = receivedItem.quantity;
  });

  res.render("receiptForm", {
    title: "Update Receipt",
    receipt,
    items,
    thisReceiptItems,
  });
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
