const mongoose = require("mongoose");
const async = require("async");
const validator = require("express-validator");
const Order = require("../models/order");
const InventoryCount = require("../models/inventoryCount");
const Item = require("../models/item");
const Receipt = require("../models/receipt");

exports.index = function inventoryHome(req, res, next) {
  async.parallel(
    {
      orders(callback) {
        Order.find(
          { status: { $in: ["Saved", "Ordered"] } },
          "orderDate deliveryDate status lastUpdated"
        )
          .sort([["lastUpdated", "descending"]])
          .exec(callback);
      },
      counts(callback) {
        InventoryCount.find(
          { dateSubmitted: undefined },
          "dateInitiated dateSubmitted type"
        )
          .sort([["dateInitiated", "descending"]])
          .exec(callback);
      },
      items(callback) {
        Item.find()
          .populate("category")
          .sort([["itemLastUpdated", "descending"]])
          .exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      res.render("index", {
        title: "Caf\xE9 Corcovado Inventory",
        orders: results.orders,
        counts: results.counts,
        items: results.items,
      });
    }
  );
};

exports.order_home = function orderHome(req, res, next) {
  async.waterfall(
    [
      function getFilter(callback) {
        // Get the filter for our Order query and the filter variable to pass to our template
        let { filter } = req.query;
        filter = filter
          ? filter.charAt(0).toUpperCase() + filter.slice(1)
          : "Open";
        let queryFilter;
        if (filter === "All") {
          queryFilter = ["Saved", "Ordered", "Received"];
        } else if (["Saved", "Ordered", "Received"].includes(filter)) {
          queryFilter = Array(filter);
        } else {
          filter = "Open";
          queryFilter = ["Saved", "Ordered"];
        }
        callback(null, queryFilter, filter);
      },
      function getOrders(queryFilter, filter, callback) {
        Order.find(
          { status: { $in: queryFilter } },
          "orderDate deliveryDate status lastUpdated"
        )
          .sort([["lastUpdated", "descending"]])
          .exec((err, filteredOrders) => {
            if (err) {
              return next(err);
            }
            callback(null, { filter, filteredOrders });
          });
      },
    ],
    (err, results) => {
      if (err) {
        return next(err);
      }
      res.render("ordersHome", {
        filter: results.filter,
        orders: results.filteredOrders,
        title: "Orders",
      });
    }
  );
};

exports.order_detail = function orderDetail(req, res, next) {
  // Need 'order', 'receipt' if received, populate orderedItems->item, populate orderItems->item->category. Organize items by category then alpha?
  async.parallel(
    {
      order(callback) {
        Order.findById(req.params.id)
          .populate({
            path: "orderedItems.item",
            populate: {
              path: "category",
            },
          })
          .exec(callback);
      },
      receipt(callback) {
        Receipt.findOne({ orderReceived: req.params.id }).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      res.render("orderDetail", {
        order: results.order,
        receipt: results.receipt,
        title: "Order Details",
      });
    }
  );
};

exports.order_create_get = async function orderCreateGet(req, res, next) {
  // get items -- name, sku, quantityInStock
  const fetchItems = Item.find({}, "name sku quantityInStock").exec();

  // create a hash of items -- { id: quantity on order }
  async function getItemsOnOrder() {
    const orders = await Order.find(
      { status: "Ordered" },
      "orderedItems"
    ).exec();

    const itemQtyHash = {};
    orders.forEach((order) => {
      order.orderedItems.forEach((orderedItem) => {
        const id = orderedItem.item.toString();
        if (itemQtyHash[id]) itemQtyHash[id] += orderedItem.quantity;
        else itemQtyHash[id] = orderedItem.quantity;
      });
    });

    return itemQtyHash;
  }

  const [items, onOrder] = await Promise.all([
    fetchItems,
    getItemsOnOrder(),
  ]).catch((err) => next(err));

  items.sort((a, b) => {
    if (a.sku !== b.sku) {
      return a.sku > b.sku ? 1 : -1;
    }
    return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
  });

  // render order form
  res.render("orderForm", { title: "Create New Order", items, onOrder });
};

exports.order_create_post = [
  function removeItemsNotOrdered(req, res, next) {
    req.body.orderedItems = req.body.orderedItems.filter(
      (item) => item.quantity !== ""
    );
    next();
  },

  validator.body("orderedItems.*.id").escape(),
  validator.body("orderedItems.*.quantity").isInt({ lt: 10000000 }).escape(),
  validator.body("submitButton").isIn(["placeOrder", "save"]).escape(),

  async function orderCreatePost(req, res, next) {
    // grab errors
    const { errors } = validator.validationResult(req);

    // get submit type
    const { submitButton, orderedItems } = req.body;

    // construct new Order
    const newOrder = {
      orderDate: submitButton === "placeOrder" ? Date.now() : undefined,
      status: submitButton === "placeOrder" ? "Ordered" : "Saved",
      orderedItems: orderedItems.map((orderedItem) => {
        return {
          item: mongoose.Types.ObjectId(orderedItem.id),
          quantity: orderedItem.quantity,
        };
      }),
      lastUpdated: Date.now(),
    };

    const order = new Order(newOrder);

    // if errors
    if (errors.length > 0) {
      // get items -- name, sku, quantityInStock
      const fetchItems = Item.find({}, "name sku quantityInStock").exec();

      // create a hash of items -- { id: quantity on order }
      async function getItemsOnOrder() {
        const orders = await Order.find(
          { status: "Ordered" },
          "orderedItems"
        ).exec();

        const itemQtyHash = {};
        orders.forEach((order) => {
          order.orderedItems.forEach((orderedItem) => {
            const id = orderedItem.item.toString();
            if (itemQtyHash[id]) itemQtyHash[id] += orderedItem.quantity;
            else itemQtyHash[id] = orderedItem.quantity;
          });
        });

        return itemQtyHash;
      }

      const [items, onOrder] = await Promise.all([
        fetchItems,
        getItemsOnOrder(),
      ]).catch((err) => next(err));

      items.sort((a, b) => {
        if (a.sku !== b.sku) {
          return a.sku > b.sku ? 1 : -1;
        }
        return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
      });

      const thisOrderItems = {};
      order.orderedItems.forEach((orderedItem) => {
        const id = orderedItem.item.toString();
        thisOrderItems[id] = orderedItem.quantity;
      });

      // render order form
      res.render("orderForm", {
        title: "Create New Order",
        items,
        thisOrderItems,
        onOrder,
        errors,
      });
      return;
    }

    // no validation errors -- save order and redirect to new order's page
    const savedOrder = await order.save().catch((err) => next(err));
    res.redirect(savedOrder.url);
  },
];

exports.order_update_get = function orderUpdateGet(req, res, next) {
  res.send("NOT IMPLEMENTED: Order update GET");
};

exports.order_update_post = function orderUpdatePost(req, res, next) {
  res.send("NOT IMPLEMENTED: Order update POST");
};

exports.order_delete_get = function orderDeleteGet(req, res, next) {
  res.send("NOT IMPLEMENTED: Order delete GET");
};

exports.order_delete_post = function orderDeletePost(req, res, next) {
  res.send("NOT IMPLEMENTED: Order delete POST");
};
