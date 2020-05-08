const Order = require('../models/order');
const InventoryCount = require('../models/inventoryCount');
const Item = require('../models/item');

const async = require('async');


exports.index = function (req, res, next) {

   async.parallel({

      orders: function(callback) {
         Order.find({ 'status': {$in: ['Saved', 'Ordered']} }, 'orderDate deliveryDate status lastUpdated')
        .sort([['lastUpdated', 'descending']])
        .exec(callback);
      },
      counts: function(callback) {
         InventoryCount.find({ 'dateSubmitted': undefined }, 'dateInitiated dateSubmitted type')
         .sort([['dateInitiated', 'descending']])
         .exec(callback);
      },
      items: function(callback) {
         Item.find()
         .populate('category')
         .sort([['itemLastUpdated', 'descending']])
         .exec(callback);
      }

   }, function(err, results) {
      if (err) { return next(err); }
      res.render('index', { title: 'Caf\351 Corcovado Inventory', orders: results.orders, counts: results.counts, items: results.items });
   });

};


exports.order_home = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Order home');
};

exports.order_detail = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Order detail: ' + req.params.id);
};

exports.order_create_get = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Order create GET');
};

exports.order_create_post = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Order create POST');
};

exports.order_update_get = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Order update GET');
};

exports.order_update_post = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Order update POST');
};

exports.order_delete_get = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Order delete GET');
};

exports.order_delete_post = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Order delete POST');
};