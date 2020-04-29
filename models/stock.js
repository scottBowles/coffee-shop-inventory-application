const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const StockSchema = new Schema(
   {
      item: {type: Schema.Types.ObjectId, ref: 'Item', required: true},
      status: {type: String, required: true, enum: ['ordered', 'received']},
      expirationDate: {type: Date},
      receivedDate: {type: Date}
   }
);

StockSchema
.virtual('url')
.get( function () {
   return '/inventory/stock/' + this._id;
});

module.exports = mongoose.model('Stock', StockSchema);