import mongoose from "mongoose"

// hängsle och livrem för att stoppa att databasen sparar inlägg som är för korta eller för långa
const messageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 140
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export const Message = mongoose.model("Message", messageSchema)
