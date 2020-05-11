const InventoryCount = require('../models/inventoryCount');

exports.count_home = function countHome(req, res, next) {
  res.send('NOT IMPLEMENTED');
};

exports.count_detail = function countDetail(req, res, next) {
  res.send(`NOT IMPLEMENTED: Inventory count detail: ${req.params.id}`);
};

exports.count_create_get = function countCreateGet(req, res, next) {
  res.send('NOT IMPLEMENTED');
};

exports.count_create_post = function countCreatePost(req, res, next) {
  res.send('NOT IMPLEMENTED');
};

exports.count_update_get = function countUpdateGet(req, res, next) {
  res.send('NOT IMPLEMENTED');
};

exports.count_update_post = function countUpdatePost(req, res, next) {
  res.send('NOT IMPLEMENTED');
};

exports.count_delete_get = function countDeleteGet(req, res, next) {
  res.send('NOT IMPLEMENTED');
};

exports.count_delete_post = function countDeletePost(req, res, next) {
  res.send('NOT IMPLEMENTED');
};
