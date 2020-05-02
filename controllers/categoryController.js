const Category = require('../models/category');

exports.category_list = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Category list');
};

exports.category_detail = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Category detail: ' + req.params.id);
};

exports.category_create_get = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Category create GET');
};

exports.category_create_post = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Category create POST');
};

exports.category_update_get = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Category update GET');
};

exports.category_update_post = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Category update POST');
};

exports.category_delete_get = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Category delete GET');
};

exports.category_delete_post = function (req, res, next) {
   res.send('NOT IMPLEMENTED: Category delete POST');
};