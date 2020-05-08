const Item = require('../models/item');

exports.item_home = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Item home');
};

exports.item_detail = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Item detail: ' + req.params.id);
};

exports.item_create_get = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Item create GET');
};

exports.item_create_post = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Item create POST');
};

exports.item_update_get = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Item update GET');
};

exports.item_update_post = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Item update POST');
};

exports.item_delete_get = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Item delete GET');
};

exports.item_delete_post = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Item delete POST');
};