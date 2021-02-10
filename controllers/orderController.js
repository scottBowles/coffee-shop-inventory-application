const mongoose = require("mongoose");
const async = require("async");
const moment = require("moment");
const { validationResult } = require("express-validator");
const Order = require("../models/order");
const InventoryCount = require("../models/inventoryCount");
const Item = require("../models/item");
const Receipt = require("../models/receipt");
const { getQuantitiesOnOrder } = require("./utils")
const validate = require("./validate")

exports.index = function inventoryHome(req, res, next) {
  async.parallel(
    {
      orders(callback) {
        Order.find(
          { status: { $in: ["Saved", "Ordered"] } },
          "orderDate deliveryDate status lastUpdated"
        )
          .limit(5)
          .sort([["lastUpdated", "descending"]])
          .exec(callback);
      },
      counts(callback) {
        InventoryCount.find(
          { dateSubmitted: undefined },
          "dateInitiated dateSubmitted type"
        )
          .limit(5)
          .sort([["dateInitiated", "descending"]])
          .exec(callback);
      },
      items(callback) {
        Item.find({ active: true }, "name quantityInStock category itemLastUpdated")
          .limit(5)
          .populate("category", "name")
          .sort([["itemLastUpdated", "descending"]])
          .exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      res.render("index", {
        title: "Corcovado Caf\xE9 Inventory",
        orders: results.orders,
        counts: results.counts,
        items: results.items,
      });
    }
  );
};

exports.order_home = [
  validate.escapeParam("filter"),

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
  validate.id({ message: "Order not found" }),

  function orderDetail(req, res, next) {
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render("orderDetail", {
        title: "Order Details",
        errors,
      });
    }

    Order.findById(req.params.id)
      .populate("receipt")
      .populate({
        path: "orderedItems.item",
        select: "name sku category active",
        populate: {
          path: "category",
          select: "name"
        },
      })
      .exec((err, order) => {
        if (err) {
          return next(err);
        }
        if (order == null) {
          const notFoundError = new Error("Order not found");
          notFoundError.status = 404;
          return next(notFoundError);
        }
        return res.render("orderDetail", {
          order,
          title: "Order Details",
        });
      });
  },
];

exports.order_detail_post = [
  validate.id({ message: "Order not found" }),

  async function orderDetailPost(req, res, next) {
    const { errors } = validationResult(req);
    if (errors.length > 0) {
      return res.render("orderDetail", {
        title: "Order Details",
        errors,
      });
    }

    const order = await Order.findById(req.params.id).exec();

    if (order === null) {
      const notFoundError = new Error("Order not found");
      notFoundError.status = 404;
      return next(notFoundError);
    }

    if (order.status !== "Saved") {
      const populatedOrder = await order
        .populate({
          path: "orderedItems.item",
          select: "name sku category active",
          populate: {
            path: "category",
            select: "name"
          },
        })
        .execPopulate();

      return res.render("orderDetail", {
        title: "Order Details",
        order: populatedOrder,
        receipt: order.receipt,
        errors: [{ msg: "Order was already placed." }],
      });
    }

    order.orderDate = Date.now();
    order.deliveryDate = moment().add(7, "days");
    order.lastUpdated = Date.now();
    order.status = "Ordered";

    await order.save();
    return res.redirect(order.url);
  },
];

exports.order_create_get = async function orderCreateGet(req, res, next) {
  const fetchItems = Item.find(
    { active: true },
    "name sku quantityInStock"
  ).exec();

  const fetchOrders = Order.find({ status: "Ordered" }, "orderedItems").exec();

  const [items, orders] = await Promise.all([
    fetchItems,
    fetchOrders,
  ]).catch((err) => next(err));

  items.sort((a, b) => {
    if (a.sku !== b.sku) {
      return a.sku > b.sku ? 1 : -1;
    }
    return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
  });

  // create hash of {[id]: [qty]} for item quantities currently on order
  const onOrder = {};
  orders.forEach((order) => {
    order.orderedItems.forEach((orderedItem) => {
      const id = orderedItem.item.toString();
      if (onOrder[id]) onOrder[id] += orderedItem.quantity;
      else onOrder[id] = orderedItem.quantity;
    });
  });

  return res.render("orderForm", { title: "Create New Order", items, onOrder });
};

exports.order_create_post = [
  function removeItemsNotOrdered(req, res, next) {
    req.body.orderedItems = req.body.orderedItems.filter(
      (item) => item.quantity !== ""
    );
    next();
  },

  validate.orderedItems(),
  validate.submitType("submitType", ["placeOrder", "save"]),
  validate.password(),

  async function orderCreatePost(req, res, next) {
    const { errors } = validationResult(req);
    const { submitType, orderedItems } = req.body;

    const newOrder = new Order({
      orderDate: submitType === "placeOrder" ? Date.now() : undefined,
      deliveryDate:
        submitType === "placeOrder" ? moment().add(7, "days") : undefined,
      status: submitType === "placeOrder" ? "Ordered" : "Saved",
      orderedItems: orderedItems.map((orderedItem) => {
        return {
          item: mongoose.Types.ObjectId(orderedItem.id),
          quantity: orderedItem.quantity,
        };
      }),
      lastUpdated: Date.now(),
    });

    if (errors.length === 0) {
      // no validation errors -- save order and redirect to new order's page
      await newOrder.save().catch((err) => next(err));
      return res.redirect(newOrder.url);
    }

    /*
     *  VALIDATION ERRORS -- RE-RENDER ORDER FORM
     */

    const fetchItems = Item.find({}, "name sku quantityInStock").exec();
    const fetchOrders = Order.find(
      { status: "Ordered" },
      "orderedItems"
    ).exec();

    const [items, orders] = await Promise.all([
      fetchItems,
      fetchOrders,
    ]).catch((err) => next(err));

    items.sort((a, b) => {
      if (a.sku !== b.sku) {
        return a.sku > b.sku ? 1 : -1;
      }
      return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
    });

    // create hash of {[id]: [qty]} of items on order
    const onOrder = {};
    orders.forEach((order) => {
      order.orderedItems.forEach((orderedItem) => {
        const id = orderedItem.item.toString();
        if (onOrder[id]) onOrder[id] += orderedItem.quantity;
        else onOrder[id] = orderedItem.quantity;
      });
    });

    const thisOrderItems = {};
    newOrder.orderedItems.forEach((orderedItem) => {
      const id = orderedItem.item.toString();
      thisOrderItems[id] = orderedItem.quantity;
    });

    // render order form
    return res.render("orderForm", {
      title: "Create New Order",
      items,
      thisOrderItems,
      onOrder,
      errors,
    });
  },
];

exports.order_update_get = [
  validate.id({ message: "Order not found" }),

  async function orderUpdateGet(req, res, next) {
    const { errors } = validationResult(req);
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
      const notFoundError = new Error("Order not found");
      notFoundError.status = 404;
      return next(notFoundError);
    }

    // if order has already been placed, re-render detail page with error message
    if (order.status !== "Saved") {
      const populatedOrder = await order
        .populate({
          path: "orderedItems.item",
          select: "name sku category active",
          populate: {
            path: "category",
            select: "name"
        },
        })
        .execPopulate();

      return res.render("orderDetail", {
        title: "Order Details",
        order: populatedOrder,
        receipt: order.receipt,
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
  validate.id({ message: "Order not found" }),
  validate.orderedItems(),
  validate.submitType("submitType", ["placeOrder", "save"]),
  validate.password(),

  async function orderUpdatePost(req, res, next) {
    // grab errors & submitType
    const { errors } = validationResult(req);
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

    if (order === null) {
      const notFoundError = new Error("Order not found");
      notFoundError.status = 404;
      return next(notFoundError);
    }

    // if order.status !== "Saved", render detail page with errors
    if (order.status !== "Saved") {
      const populatedOrder = await order
        .populate({
          path: "orderedItems.item",
          select: "name sku category active",
          populate: {
            path: "category",
            select: "name"
          },
        })
        .execPopulate();

      return res.render("orderDetail", {
        title: "Order Details",
        order: populatedOrder,
        receipt: order.receipt,
        errors: [{ msg: "Cannot update an order once it has been placed." }],
      });
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

      const [items, onOrder] = await Promise.all([
        fetchItems,
        getQuantitiesOnOrder(),
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

      return res.render("orderForm", {
        title: "Update Order",
        order,
        items,
        onOrder,
        thisOrderItems,
        errors,
      });
    }

    // no errors: update order
    order.orderDate = submitType === "placeOrder" ? Date.now() : undefined;
    order.deliveryDate =
      submitType === "placeOrder" ? moment().add(7, "days") : undefined;
    order.status = submitType === "placeOrder" ? "Ordered" : "Saved";
    order.lastUpdated = Date.now();

    // save order.
    await order.save();

    // redirect to order.url
    return res.redirect(order.url);
  },
];

exports.order_delete_get = [
  validate.id({ message: "Order not found" }),
  async function orderDeleteGet(req, res, next) {
    try {
      const { errors } = validationResult(req);
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
          select: "name sku category active",
          populate: {
            path: "category",
            select: "name"
          },
        })
        .exec();

      if (order === null) {
        const notFoundError = new Error("Order not found");
        notFoundError.status = 404;
        return next(notFoundError);
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
  validate.password(),
  validate.id({ message: "Order not found" }),

  async function orderDeletePost(req, res, next) {
    try {
      const { errors } = validationResult(req);
      if (errors.length > 0) {
        const { id } = req.params;

        const order = await Order.findById(id)
          .populate("receipt")
          .populate({
            path: "orderedItems.item",
            select: "name sku category active",
            populate: {
              path: "category",
              select: "name"
            },
          })
          .exec();

        if (order === null) {
          const notFoundError = new Error("Order not found");
          notFoundError.status = 404;
          return next(notFoundError);
        }

        order.orderedItems.sort((a, b) => {
          if (a.item.sku !== b.item.sku) {
            return a.item.sku > b.item.sku ? 1 : -1;
          }
          return a.item.name.toLowerCase() > b.item.name.toLowerCase() ? 1 : -1;
        });

        return res.render("orderDelete", {
          title: "Delete Order",
          order,
          errors,
        });
      }

      // delete order and, if receipt, receipt
      const order = await Order.findByIdAndDelete(req.params.id)
        .populate("receipt")
        .exec();

      if (order === null) {
        const notFoundError = new Error("Order not found");
        notFoundError.status = 404;
        return next(notFoundError);
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
