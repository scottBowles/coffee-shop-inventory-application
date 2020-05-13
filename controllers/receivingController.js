const async = require('async');
const Receipt = require('../models/receipt');
const Order = require('../models/order');

exports.receiving_home = function receivingHome(req, res, next) {
  async.auto({
    receiptsFilter(callback) {
      const { filter } = req.query;
      const filterSanitized = filter === 'all' ? 'all' : 'recent';
      callback(null, filterSanitized);
    },
    orders(callback) {
      Order.find({ status: 'Ordered' })
        .sort({ deliveryDate: 'descending' })
        .exec(callback);
    },
    receipts: ['receiptsFilter', function (results, callback) {
      if (results.receiptsFilter === 'all') {
        Receipt.find({})
          .sort({ submitted: 'descending', dateInitiated: 'descending' })
          .exec(callback);
      } else {
        Receipt.find({})
          .sort({ submitted: 'descending', dateInitiated: 'descending' })
          .limit(5)
          .exec(callback);
      }
    }],
  }, (err, results) => {
    if (err) { return next(err); }
    res.render('receivingHome', {
      title: 'Receiving',
      orders: results.orders,
      filter: results.receiptsFilter,
      receipts: results.receipts,
    });
  });
};

exports.receipt_detail = function receiptDetail(req, res, next) {
  res.send(`NOT IMPLEMENTED: Receipt detail: ${req.params.id}`);
};

exports.receipt_create_get = function receiptCreateGet(req, res, next) {
  res.send('NOT IMPLEMENTED');
};

exports.receipt_create_post = function receiptCreatePost(req, res, next) {
  res.send('NOT IMPLEMENTED');
};

exports.receipt_update_get = function receiptUpdateGet(req, res, next) {
  res.send('NOT IMPLEMENTED');
};

exports.receipt_update_post = function receiptUpdatePost(req, res, next) {
  res.send('NOT IMPLEMENTED');
};

exports.receipt_delete_get = function receiptDeleteGet(req, res, next) {
  res.send('NOT IMPLEMENTED');
};

exports.receipt_delete_post = function receiptDeletePost(req, res, next) {
  res.send('NOT IMPLEMENTED');
};
