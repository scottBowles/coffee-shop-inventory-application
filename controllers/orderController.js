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

exports.order_home = [
  validator.param("filter").escape(),

  function orderHome(req, res, next) {
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
            .populate("receipt")
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
  },
];

exports.order_detail_get = [
  validator.param("id").isMongoId().withMessage("Order not found").escape(),

  function orderDetail(req, res, next) {
    const { errors } = validator.validationResult(req);
    if (errors.length > 0) {
      return res.render("orderDetail", {
        title: "Order Details",
        errors,
      });
    }

    // Need 'order', 'receipt' if received, populate orderedItems->item, populate orderItems->item->category. Organize items by category then alpha?
    async.parallel(
      {
        order(callback) {
          Order.findById(req.params.id)
            .populate("receipt")
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
        if (results.order == null) {
          return res.render("orderDetail", {
            title: "Order Details",
            errors: [{ msg: "Order not found" }],
          });
        }
        return res.render("orderDetail", {
          order: results.order,
          receipt: results.receipt,
          title: "Order Details",
        });
      }
    );
  },
];

exports.order_detail_post = [
  validator.param("id").isMongoId().withMessage("Order not found").escape(),

  async function orderDetailPost(req, res, next) {
    const { errors } = validator.validationResult(req);
    if (errors.length > 0) {
      return res.render("orderDetail", {
        title: "Order Details",
        errors,
      });
    }

    const order = await Order.findById(req.params.id).exec();
    if (order == null) {
      return res.render("orderDetail", {
        title: "Order Details",
        errors: [{ msg: "Order not found" }],
      });
    }

    if (order.status !== "Saved") {
      const populateOrder = order
        .populate({
          path: "orderedItems.item",
          populate: {
            path: "category",
          },
        })
        .execPopulate();

      const fetchReceipt = Receipt.findOne({
        orderReceived: req.params.id,
      }).exec();

      const [populatedOrder, receipt] = await Promise.all([
        populateOrder,
        fetchReceipt,
      ]).catch((err) => next(err));

      return res.render("orderDetail", {
        title: "Order Details",
        order: populatedOrder,
        receipt,
        errors: [{ msg: "Order was already placed." }],
      });
    }

    order.status = "Ordered";
    order.orderDate = Date.now();
    order.lastUpdated = Date.now();
    await order.save();
    return res.redirect(order.url);
  },
];

exports.order_create_get = async function orderCreateGet(req, res, next) {
  // get items
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
  validator.body("submitType").isIn(["placeOrder", "save"]).escape(),

  async function orderCreatePost(req, res, next) {
    // grab errors
    const { errors } = validator.validationResult(req);

    // get submit type
    const { submitType, orderedItems } = req.body;

    // construct new Order
    const newOrder = {
      orderDate: submitType === "placeOrder" ? Date.now() : undefined,
      status: submitType === "placeOrder" ? "Ordered" : "Saved",
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

exports.order_update_get = [
  validator.param("id").isMongoId().withMessage("Order not found").escape(),

  async function orderUpdateGet(req, res, next) {
    const { errors } = validator.validationResult(req);
    if (errors.length > 0) {
      return res.render("orderDetail", {
        title: "Order Details",
        errors,
      });
    }

    // get order id
    const orderId = req.params.id;

    // fetch order
    const fetchOrder = Order.findById(orderId).exec();

    // fetch items -- name, sku, quantityInStock
    const fetchItems = Item.find({}, "name sku quantityInStock").exec();

    // create a hash of items -- { id: totalQuantityOnOrder }
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

    const [order, items, onOrder] = await Promise.all([
      fetchOrder,
      fetchItems,
      getItemsOnOrder(),
    ]).catch((err) => next(err));

    if (order == null) {
      return res.render("orderDetail", {
        title: "Order Details",
        errors: [{ msg: "Order not found" }],
      });
    }

    // if order has already been placed, re-render detail page with error message
    if (order.status !== "Saved") {
      const populateOrder = order
        .populate({
          path: "orderedItems.item",
          populate: {
            path: "category",
          },
        })
        .execPopulate();
      const fetchReceipt = Receipt.findOne({
        orderReceived: req.params.id,
      }).exec();
      const [populatedOrder, receipt] = await Promise.all([
        populateOrder,
        fetchReceipt,
      ]).catch((err) => next(err));

      return res.render("orderDetail", {
        title: "Order Details",
        order: populatedOrder,
        receipt,
        errors: [{ msg: "Cannot update an order once it has been placed." }],
      });
    }

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

    return res.render("orderForm", {
      title: "Update Order",
      order,
      items,
      onOrder,
      thisOrderItems,
    });
  },
];

exports.order_update_post = [
  // remove empty items
  function removeEmptyItems(req, res, next) {
    req.body.orderedItems = req.body.orderedItems.filter(
      (item) => item.quantity !== ""
    );
    next();
  },

  // validate & sanitize
  validator.param("id").isMongoId().withMessage("Order not found").escape(),
  validator.body("orderedItems.*.id").escape(),
  validator.body("orderedItems.*.quantity").isInt({ lt: 10000000 }).escape(),
  validator.body("submitType").isIn(["placeOrder", "save"]).escape(),

  async function updatePost(req, res, next) {
    // grab errors & submitType
    const { errors } = validator.validationResult(req);
    const { submitType } = req.body;

    // if our orderId from params is bad, handle before we try to fetch the order
    const paramErrors = errors.filter((error) => error.location === "params");
    if (paramErrors.length > 0) {
      return res.render("orderForm", {
        title: "Update Order",
        errors,
      });
    }

    // fetch order
    const order = await Order.findById(req.params.id);

    if (order == null) {
      return res.render("orderForm", {
        title: "Update Order",
        errors: [{ msg: "Order not found" }],
      });
    }

    // if order.status !== "Saved", render detail page with errors
    if (order.status !== "Saved") {
      const populateOrder = order
        .populate({
          path: "orderedItems.item",
          populate: {
            path: "category",
          },
        })
        .execPopulate();

      const fetchReceipt = Receipt.findOne({
        orderReceived: req.params.id,
      }).exec();

      const [populatedOrder, receipt] = await Promise.all([
        populateOrder,
        fetchReceipt,
      ]).catch((err) => next(err));

      res.render("orderDetail", {
        title: "Order Details",
        order: populatedOrder,
        receipt,
        errors: [{ msg: "Cannot update an order once it has been placed." }],
      });
      return;
    }

    // update order.orderedItems
    order.orderedItems = req.body.orderedItems.map((orderedItem) => {
      const { id, quantity } = orderedItem;
      return { item: mongoose.Types.ObjectId(id), quantity };
    });

    // if errors, re-render "orderForm"
    if (errors.length > 0) {
      // fetch items
      const fetchItems = Item.find({}, "name sku quantityInStock").exec();

      // create a hash of items -- { id: totalQuantityOnOrder }
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

      // create a hash of this order's items for the frontend
      const thisOrderItems = {};
      order.orderedItems.forEach((orderedItem) => {
        const id = orderedItem.item.toString();
        thisOrderItems[id] = orderedItem.quantity;
      });

      res.render("orderForm", {
        title: "Update Order",
        order,
        items,
        onOrder,
        thisOrderItems,
        errors,
      });
      return;
    }

    // no errors: update order
    order.orderDate = submitType === "placeOrder" ? Date.now() : undefined;
    order.status = submitType === "placeOrder" ? "Ordered" : "Saved";
    order.lastUpdated = Date.now();

    // save order.
    await order.save();

    // redirect to order.url
    res.redirect(order.url);
  },
];

exports.order_delete_get = [
  validator.param("id").isMongoId().withMessage("Order not found").escape(),
  async function orderDeleteGet(req, res, next) {
    try {
      const { errors } = validator.validationResult(req);
      if (errors.length > 0) {
        return res.render("orderDelete", {
          title: "Delete Order",
          errors,
        });
      }

      const { id } = req.params;

      const order = await Order.findById(id)
        .populate("receipt")
        .populate({
          path: "orderedItems.item",
          populate: {
            path: "category",
          },
        })
        .exec();

      if (order == null) {
        return res.render("orderDelete", {
          title: "Delete Order",
          errors: [{ msg: "Order not found" }],
        });
      }

      order.orderedItems.sort((a, b) => {
        if (a.item.sku !== b.item.sku) {
          return a.item.sku > b.item.sku ? 1 : -1;
        }
        return a.item.name.toLowerCase() > b.item.name.toLowerCase() ? 1 : -1;
      });

      return res.render("orderDelete", { title: "Delete Order", order });
    } catch (error) {
      return next(error);
    }
  },
];

exports.order_delete_post = [
  validator.param("id").isMongoId().withMessage("Order not found").escape(),
  async function orderDeletePost(req, res, next) {
    try {
      const { errors } = validator.validationResult(req);
      if (errors.length > 0) {
        return res.render("orderDelete", { title: "Delete Order", errors });
      }

      // delete order and, if receipt, receipt
      const order = await Order.findByIdAndDelete(req.params.id)
        .populate("receipt")
        .exec();

      if (order == null) {
        return res.render("orderDelete", {
          title: "Delete Order",
          errors: [{ msg: "Order not found" }],
        });
      }

      if (order.receipt) {
        const receiptId = order.receipt._id;
        await Receipt.findByIdAndDelete(receiptId);
      }

      return res.redirect("/inventory/orders");
    } catch (error) {
      return next(error);
    }
  },
];
