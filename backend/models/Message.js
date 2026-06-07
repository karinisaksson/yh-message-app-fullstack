import mongoose from "mongoose"

// Här stoppas att databasen sparar inlägg som är för korta eller för långa. Del av säkerhetskrav 10. 
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
