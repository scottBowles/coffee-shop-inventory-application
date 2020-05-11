const Receipt = require('../models/receipt');

exports.receiving_home = function receivingHome(req, res, next) {
  res.send('NOT IMPLEMENTED');
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
