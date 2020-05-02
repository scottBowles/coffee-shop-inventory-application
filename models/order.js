const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const OrderSchema = new Schema(
   {
      orderDate: {type: Date, required: true, default: Date.now},
      deliveryDate: {type: Date, required: true},
      received: {type:Boolean, required: true, default: false},
      orderedItems: [{
         item: Schema.Types.ObjectId,
         quantity: Number,
      }],
   }
);

OrderSchema
.virtual('url')
.get(function () {
   return '/inventory/order/' + this._id;
});

module.exports = mongoose.model('Order', OrderSchema);