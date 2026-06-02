import mongoose from "mongoose"

// för att definiera hur lång meddelandet får vara, skriv in  
//   minlength: 3,
// maxlength: 140 (efter required:true)
const messageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
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
