const async = require('async');

const Order = require('../models/order');
const InventoryCount = require('../models/inventoryCount');
const Item = require('../models/item');

exports.index = function inventoryHome(req, res, next) {
  async.parallel({

    orders(callback) {
      Order.find({ status: { $in: ['Saved', 'Ordered'] } }, 'orderDate deliveryDate status lastUpdated')
        .sort([['lastUpdated', 'descending']])
        .exec(callback);
    },
    counts(callback) {
      InventoryCount.find({ dateSubmitted: undefined }, 'dateInitiated dateSubmitted type')
        .sort([['dateInitiated', 'descending']])
        .exec(callback);
    },
    items(callback) {
      Item.find()
        .populate('category')
        .sort([['itemLastUpdated', 'descending']])
        .exec(callback);
    },

  }, (err, results) => {
    if (err) { return next(err); }
    res.render('index', {
      title: 'Caf\xE9 Corcovado Inventory',
      orders: results.orders,
      counts: results.counts,
      items: results.items,
    });
  });
};


exports.order_home = function orderHome(req, res, next) {
  res.send('NOT IMPLEMENTED: Order home');
};

exports.order_detail = function orderDetail(req, res, next) {
  res.send(`NOT IMPLEMENTED: Order detail: ${req.params.id}`);
};

exports.order_create_get = function orderCreateGet(req, res, next) {
  res.send('NOT IMPLEMENTED: Order create GET');
};

exports.order_create_post = function orderCreatePost(req, res, next) {
  res.send('NOT IMPLEMENTED: Order create POST');
};

exports.order_update_get = function orderUpdateGet(req, res, next) {
  res.send('NOT IMPLEMENTED: Order update GET');
};

exports.order_update_post = function orderUpdatePost(req, res, next) {
  res.send('NOT IMPLEMENTED: Order update POST');
};

exports.order_delete_get = function orderDeleteGet(req, res, next) {
  res.send('NOT IMPLEMENTED: Order delete GET');
};

exports.order_delete_post = function orderDeletePost(req, res, next) {
  res.send('NOT IMPLEMENTED: Order delete POST');
};
