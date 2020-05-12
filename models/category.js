const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, max: 100 },
    description: { type: String, required: true, max: 256 },
  },
);

CategorySchema
  .virtual('items', {
    ref: 'Item',
    localField: '_id',
    foreignField: 'category',
    justOne: false,
    options: { sort: { name: 'ascending' } },
  });

CategorySchema
  .virtual('numItems', {
    ref: 'Item',
    localField: '_id',
    foreignField: 'category',
    count: true,
  });

CategorySchema
  .virtual('url')
  .get(function () {
    return `/inventory/category/${this._id}`;
  });

module.exports = mongoose.model('Category', CategorySchema);
