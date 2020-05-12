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
  async.waterfall([
    function getFilter(callback) {
      let { filter } = req.query;
      filter = filter ? filter.charAt(0).toUpperCase() + filter.slice(1) : 'Open';
      let queryFilter;
      if (filter === 'All') {
        queryFilter = ['Saved', 'Ordered', 'Received'];
      } else if (['Saved', 'Ordered', 'Received'].includes(filter)) {
        queryFilter = Array(filter);
      } else {
        filter = 'Open';
        queryFilter = ['Saved', 'Ordered'];
      }
      callback(null, queryFilter, filter);
    },
    function getOrders(queryFilter, filter, callback) {
      Order.find({ status: { $in: queryFilter } }, 'orderDate deliveryDate status lastUpdated')
        .sort([['lastUpdated', 'descending']])
        .exec((err, filteredOrders) => {
          if (err) { return next(err); }
          callback(null, { filter, filteredOrders });
        });
    },
  ], (err, results) => {
    if (err) { return next(err); }
    res.render('ordersHome', { filter: results.filter, orders: results.filteredOrders, title: 'Orders' });
  });
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
