const mongoose = require("mongoose");

const { Schema } = mongoose;

const CategorySchema = new Schema({
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 256 },
  image: {
    data: Buffer,
    contentType: String,
  },
});

CategorySchema.virtual("items", {
  ref: "Item",
  localField: "_id",
  foreignField: "category",
  justOne: false,
  options: { sort: { name: "ascending" } },
});

CategorySchema.virtual("numItems", {
  ref: "Item",
  localField: "_id",
  foreignField: "category",
  count: true,
  match: { active: true },
});

CategorySchema.virtual("url").get(function () {
  return `/inventory/category/${this._id}`;
});

CategorySchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Category", CategorySchema);
