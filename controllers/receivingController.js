const async = require("async");
const { body, param, validationResult } = require("express-validator");
const mongoose = require("mongoose");
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
            .populate("receipt")
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
        return res.render("receivingHome", {
          title: "Receiving",
          orders: results.orders,
          filter: results.filter,
          receipts: results.receipts,
        });
      }
    );
  }
};

exports.receipt_detail = [
  // validate/sanitize
  param("id")
    .isMongoId()
    .withMessage(
      "Receipt not found. Was something changed in the string after '/receiving/' in the url?"
    )
    .escape(),

  function receiptDetail(req, res, next) {
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render("receiptDetail", { title: "Receipt", errors });
    }

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
        if (receipt == null) {
          return res.render("receiptDetail", { title: "Receipt" });
        }
        receipt.receivedItems.sort((a, b) => b.item.name - a.item.name);
        return res.render("receiptDetail", { title: "Receipt", receipt });
      });
  },
];

exports.receipt_create_get = [
  // validate/sanitize
  param("order")
    .optional()
    .isMongoId()
    .withMessage(
      "Order not found. Was something added or changed after '/receiving/create-new/' in the url?"
    )
    .escape(),

  async function receiptCreateGet(req, res, next) {
    // handle validation errors
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render("receiptForm", {
        title: "Create New Receipt",
        errors,
      });
    }

    const orderId = req.params.order || undefined;

    // get items and, if receiving an order, order
    const fetchItems = Item.find({}, "name sku quantityInStock")
      .populate("category")
      .exec()
      .catch((err) => next(err));

    const fetchOrder = orderId
      ? Order.findById(orderId).populate("receipt").exec()
      : undefined;

    const [items, order] = await Promise.all([
      fetchItems,
      fetchOrder,
    ]).catch((err) => next(err));

    // handle if order is in params but no order is found
    if (orderId && order == null) {
      return res.render("receiptForm", {
        title: "Create New Receipt",
        errors: [
          {
            msg:
              "Order not found. Was something added or changed after '/receiving/create-new/' in the url?",
          },
        ],
      });
    }

    // if order already has an associated receipt, redirect to the update page
    if (order && order.receipt) {
      return res.redirect(`/inventory/receiving/${order.receipt._id}/update`);
    }

    // get hash of this receipt's items from the order being received
    let thisReceiptItems = {};
    if (order) {
      order.orderedItems.forEach((orderedItem) => {
        const id = orderedItem.item;
        thisReceiptItems[id] = orderedItem.quantity;
      });
    } else {
      thisReceiptItems = undefined;
    }

    // sort items
    items.sort((a, b) => {
      if (a.category && b.category && a.category.name !== b.category.name) {
        return a.category.name.toLowerCase() > b.category.name.toLowerCase()
          ? 1
          : -1;
      }
      return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
    });

    // render receipt form
    return res.render("receiptForm", {
      title: "Create New Receipt",
      items,
      thisReceiptItems,
    });
  },
];

exports.receipt_create_post = [
  // validate/sanitize
  param("order")
    .optional()
    .isMongoId()
    .withMessage("Invalid order id")
    .escape(),
  body("receivedItems.*.id").escape(),
  body("receivedItems.*.quantity")
    .optional({ checkFalsy: true })
    .isInt({ lt: 10000000 })
    .escape(),
  body("submitType").isIn(["submit", "save"]).escape(),

  async function receiptCreatePost(req, res, next) {
    const { errors } = validationResult(req);
    const { receivedItems, submitType } = req.body;
    const orderId = req.params.order || undefined;

    // if our orderId from params is bad, handle before we try to fetch the order
    const paramErrors = errors.filter((error) => error.location === "params");
    if (paramErrors.length > 0) {
      return res.render("receiptForm", {
        title: "Create New Receipt",
        errors,
      });
    }

    /*
     *  Fetch items and, if receiving an order, order.
     *  Populate item category in case of error.
     *  If order already has a receipt, redirect to the receipt's update page
     */

    const fetchItems = Item.find({}).populate("category").exec();
    const fetchOrder = orderId
      ? Order.findById(orderId).populate("receipt").exec()
      : undefined;
    const [items, order] = await Promise.all([
      fetchItems,
      fetchOrder,
    ]).catch((err) => next(err));

    // handle if order is in params but no order is found
    if (orderId && order == null) {
      return res.render("receiptForm", {
        title: "Create New Receipt",
        errors: [
          {
            msg:
              "Order not found. Was something added or changed after '/receiving/create-new/' in the url?",
          },
        ],
      });
    }

    // if order already has an associated receipt, redirect to the update page
    if (order && order.receipt) {
      return res.redirect(`/inventory/receiving/${order.receipt._id}/update`);
    }

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

    if (order) {
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
      orderReceived: order ? order._id : undefined,
    });

    /*
     *  If errors, rerender receiptForm with errors
     */

    if (errors.length > 0) {
      items.sort((a, b) => {
        return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
      });

      // render receipt form
      return res.render("receiptForm", {
        title: "Create New Receipt",
        thisReceiptItems: receivedItemHash,
        items,
        errors,
      });
    }

    /*
     *  No errors -- amend and save to db and redirect
     */

    if (submitType === "submit") {
      // amend order
      if (order) {
        order.deliveryDate = Date.now();
        order.lastUpdated = Date.now();
        order.status = "Received";
      }

      // amend items in receipt
      const amendedItems = [];
      items.forEach((item) => {
        if (receivedItemHash[item._id]) {
          const quantityReceived = receivedItemHash[item._id];
          item.quantityInStock += +quantityReceived;
          item.qtyLastUpdated = Date.now();
          item.itemLastUpdated = Date.now();
          amendedItems.push(item);
        } else if (receivedItemHash[item._id] === "0") {
          item.qtyLastUpdated = Date.now();
          item.itemLastUpdated = Date.now();
          amendedItems.push(item);
        }
      });

      // save items, order, and receipt
      const saveItems = amendedItems.map((item) => item.save());
      const saveOrder = order ? order.save() : undefined;
      const saveReceipt = newReceipt.save();
      const [savedReceipt] = await Promise.all([
        saveReceipt,
        saveOrder,
        ...saveItems,
      ]);
      // redirect to receipt detail page
      return res.redirect(savedReceipt.url);
    }

    // submitType presumed to be "save" given validation result
    const savedReceipt = await newReceipt.save();

    // redirect to receipt detail page
    return res.redirect(savedReceipt.url);
  },
];

exports.receipt_update_get = [
  param("id")
    .isMongoId()
    .withMessage(
      "Receipt not found. Was something added or changed in the string after '/receiving/' and before '/update' in the url?"
    )
    .escape(),

  async function receiptUpdateGet(req, res, next) {
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render("receiptForm", {
        title: "Update Receipt",
        errors,
      });
    }

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
      // sort, with category-less items assigned "None"
      receipt.receivedItems.forEach((receivedItem) => {
        receivedItem.category = receivedItem.category || { name: "None" };
      });

      receipt.receivedItems.sort((a, b) => b.item.name - a.item.name);
      return res.render("receiptDetail", {
        title: "Receipt",
        receipt,
        errors: [
          { msg: "Cannot update a receipt once it has been submitted." },
        ],
      });
    }

    items.sort((a, b) => {
      return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
    });

    const thisReceiptItems = {};
    receipt.receivedItems.forEach((receivedItem) => {
      const id = receivedItem.item._id.toString();
      thisReceiptItems[id] = receivedItem.quantity;
    });

    return res.render("receiptForm", {
      title: "Update Receipt",
      receipt,
      items,
      thisReceiptItems,
    });
  },
];

exports.receipt_update_post = [
  // validate/sanitize
  param("id").isMongoId().withMessage("Invalid receipt").escape(),
  body("receivedItems.*.id").escape(),
  body("receivedItems.*.quantity")
    .optional({ checkFalsy: true })
    .isInt({ lt: 10000000 })
    .escape(),
  body("submitType").isIn(["submit", "save"]).escape(),

  async function receiptUpdatePost(req, res, next) {
    const { errors } = validationResult(req);
    const receiptId = req.params.id;
    const { receivedItems, submitType } = req.body;

    // if our orderId from params is bad, handle before we try to fetch the order
    const paramErrors = errors.filter((error) => error.location === "params");
    if (paramErrors.length > 0) {
      return res.render("receiptForm", {
        title: "Update Receipt",
        errors,
      });
    }

    const fetchItems = Item.find({}).populate("category").exec();
    const fetchReceipt = Receipt.findById(receiptId)
      .populate("orderReceived")
      .exec();

    const [items, receipt] = await Promise.all([
      fetchItems,
      fetchReceipt,
    ]).catch((err) => next(err));

    const order = receipt.orderReceived;

    if (receipt.submitted) {
      return res.redirect(receipt.url);
    }

    // create receivedItemHash preserving zeroes from ordered items, if receiving an order
    const receivedItemsFiltered = receivedItems.filter(
      (item) => !!item.quantity
    );

    const receivedItemHash = {};
    receivedItemsFiltered.forEach((item) => {
      receivedItemHash[item.id] = item.quantity;
    });

    if (order) {
      order.orderedItems.forEach((orderedItem) => {
        receivedItemHash[orderedItem.item] =
          receivedItemHash[orderedItem.item] || "0";
      });
    }

    /*
     *  Errors? Re-render form
     */

    if (errors.length > 0) {
      if (errors.length > 0) {
        // sort items
        items.sort((a, b) => {
          if (a.category.name !== b.category.name) {
            return a.category.name.toLowerCase() > b.category.name.toLowerCase()
              ? 1
              : -1;
          }
          return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
        });

        // render receipt form
        return res.render("receiptForm", {
          title: "Update Receipt",
          thisReceiptItems: receivedItemHash,
          items,
          errors,
        });
      }
    }

    /*
     *  No errors -- amend, save to db and redirect, as appropriate to submitType
     */

    if (submitType === "submit") {
      // amend receipt
      receipt.dateSubmitted = Date.now();
      receipt.receivedItems = Object.keys(receivedItemHash).map((key) => {
        return {
          item: mongoose.Types.ObjectId(key),
          quantity: receivedItemHash[key],
        };
      });

      // amend order
      if (order) {
        order.deliveryDate = Date.now();
        order.lastUpdated = Date.now();
        order.status = "Received";
      }

      // amend each item in receipt
      const amendedItems = [];
      items.forEach((item) => {
        if (receivedItemHash[item._id]) {
          const quantityReceived = receivedItemHash[item._id];
          item.quantityInStock += +quantityReceived;
          item.qtyLastUpdated = Date.now();
          item.itemLastUpdated = Date.now();
          amendedItems.push(item);
        } else if (receivedItemHash[item._id] === "0") {
          item.qtyLastUpdated = Date.now();
          item.itemLastUpdated = Date.now();
          amendedItems.push(item);
        }
      });

      // save items, order, and receipt
      const saveItems = amendedItems.map((item) => item.save());
      const saveOrder = order ? order.save() : undefined;
      const saveReceipt = receipt.save();
      const [savedReceipt] = await Promise.all([
        saveReceipt,
        saveOrder,
        ...saveItems,
      ]);
      // redirect to receipt detail page
      return res.redirect(savedReceipt.url);
    }

    if (submitType === "save") {
      // update receivedItems
      receipt.receivedItems = Object.keys(receivedItemHash).map((key) => {
        return {
          item: mongoose.Types.ObjectId(key),
          quantity: receivedItemHash[key],
        };
      });
      await receipt.save();
      // redirect to receipt detail page
      return res.redirect(receipt.url);
    }

    /*
     *  A different submitType somehow got through validation
     */

    errors.push({ msg: "Invalid submit type" });

    // sort items
    items.sort((a, b) => {
      if (a.category.name !== b.category.name) {
        return a.category.name.toLowerCase() > b.category.name.toLowerCase()
          ? 1
          : -1;
      }
      return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
    });

    // render receipt form
    return res.render("receiptForm", {
      title: "Update Receipt",
      thisReceiptItems: receivedItemHash,
      items,
      errors,
    });
  },
];

exports.receipt_delete_get = function receiptDeleteGet(req, res, next) {
  res.send("NOT IMPLEMENTED");
};

exports.receipt_delete_post = function receiptDeletePost(req, res, next) {
  res.send("NOT IMPLEMENTED");
};
