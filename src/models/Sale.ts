import mongoose, { Schema, model, models } from "mongoose";

const SaleSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      type: String,
      required: true,
    }
  ],
  date: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

const Sale = models.Sale || model("Sale", SaleSchema);

export default Sale;
