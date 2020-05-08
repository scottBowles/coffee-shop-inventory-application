const Order = require('../models/order');
const InventoryCount = require('../models/inventoryCount');
const Item = require('../models/item');

const async = require('async');


exports.index = function (req, res, next) {

   async.parallel({

      

   }, function(err, results) {
      res.render('index', { title: 'Caf\351 Corcovado Inventory', current: 'inventory' })
   })

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