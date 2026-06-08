import "dotenv/config"
import helmet from "helmet"
import cors from "cors"
import express from "express"
import mongoose from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { Message } from "./models/Message.js"
import { User } from "./models/User.js"
import { authenticateUser } from "./middleware/auth.js"
import "./config/db.js"
import listEndpoints from "express-list-endpoints"
import { loginLimiter } from "./middleware/rateLimiter.js"
// Säkerhetskrav 6: Importerar middlewaren loginLimiter
import mongoSanitize from "express-mongo-sanitize" //Säkerhetskrav 1: Importerar för att sanera input och skydda mot NoSQL-injection. 

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set in .env")

const PORT = process.env.PORT || "3000"
const app = express()
app.use(helmet())
app.use(cors({
  origin: "*", //Extra: app.use(cors inställt med * som origin innebär att alla domäner på internet kan skicka requests till min API. Det kan bli ett säkerhetsproblem, och är dålig praxis i produktion. 
  // bör ändras till app.use(cors({origin: min-frontends-url}))

}))
app.use(express.json())
app.use(mongoSanitize()) //Säkerhetskrav 1. Här används mongoSanitize för att sanera input och skydda mot NoSQL-injection. Vilket innebär att all inkommande request-data (body, params, query) automatiskt rensas från MongoDB-operatorer som $ och . innan de når någon route.

app.get("/", (req, res) => {
  res.send(listEndpoints(app))
})

app.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body

    if (!username || username.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Username must be at least 2 characters" })
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }]
    })

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? "email" : "username"
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists`
      })
    }
    // Säkerhetskrav 5. Här hashas lösenord med bcrypt innan det sparas i databasen. Detta fanns med från början i koden. 
    // bcrypt är en envägsfunktion, lösenordet kan inte återskapas från hashen.
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({ username: username.trim(), email, password: hashedPassword })
    await user.save()

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    )

    res.status(201).json({
      success: true,
      message: "User created successfully",
      response: {
        username: user.username,
        id: user._id,
        accessToken,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Could not create user",
      error: error,
    })
  }
})

//Säkerhetskrav 6: Lagt till middlewaren loginLimiter för att begränsa antalet inloggningsförsök. 
app.post("/login", loginLimiter, async (req, res) => {
  try {
    const { login, password } = req.body
    const user = await User.findOne({
      $or: [{ username: login }, { email: login }]
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No account found with that username or email",
        response: null,
      })
    }

    // Säkerhetskrav 5: Här jämförs det angivna lösenordet som hashas med det hashade lösenordet i databasen. Detta fanns från början och jag har inte ändrat något. 
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
        response: null,
      })
    }

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    )

    res.json({
      success: true,
      message: "Logged in successfully",
      response: {
        username: user.username,
        id: user._id,
        accessToken,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error,
    })
  }
})

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id)

//Säkerhetskrav 3. Lagt till middlewaren authenticateUser så att endast inloggade användare kan se meddelanden.
app.get("/messages", authenticateUser, async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: "desc" })
      .limit(20)
      .populate("user", "username")
      .exec()
    res.json(messages)
  } catch (error) {
    res.status(500).json({ message: "Could not fetch messages" })
  }
})
//Säkerhetskrav 3. authenticateUser finns med i app.post, vilket gör att inloggning krävs för att posta ett meddelande. Detta fanns redan med i koden från början. 
app.post("/messages", authenticateUser, async (req, res) => {
  const text = req.body.message
  if (!text || text.length < 3 || text.length > 140) {
    return res.status(400).json({ message: "Message must be between 3 and 140 characters" }) // Säkerhetskrav 10. Ändrat begränsning av längd på meddelanden. 
  }
  const message = new Message({ message: req.body.message, user: req.user._id })
  try {
    const saved = await message.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: "Could not save message", errors: err.errors })
  }
})

//Säkerhetskrav 3: Att authenicateUser finns med i app.patch(“/messages/:id gör att det krävs att man är inloggad för att redigera ett meddelande. Detta fanns med i koden från början. 
app.patch("/messages/:id", authenticateUser, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })

    //Säkerhetskrav 4. Här under säkerställs att endast ägaren av meddelandet kan redigera det, genom att man jämför den inloggades id med id på meddelandet. Annars kan vem som helst redigera alla meddelanden. Detta var med i koden från början. 
    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only edit your own messages" })
    }
    //Säkerhetskrav 10: Här lägger jag till en kontroll för att säkerställa att meddelandet som redigeras är mellan 3 och 140 tecken. 
    const editedText = req.body.editedMessage
    if (!editedText || editedText.length < 3 || editedText.length > 140) {
      return res.status(400).json({ error: "Message must be between 3 and 140 characters" })
    }

    message.message = req.body.editedMessage
    await message.save()
    const updated = await message.populate("user", "username")
    res.json(updated)
  } catch (error) {
    res.status(400).json({ error: "Could not update message" })
  }
})

// Säkerhetskrav 3/4: La till authenticateUser vid radering av meddelande, vilket gör att man måste vara inloggad för att ändra meddelande. 
app.delete("/messages/:id", authenticateUser, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })

    // Säkerhetskrav 4. Här lägger jag till samma kontroll som finns vid redigering av meddelande för att säkerställa att endast ägaren av meddelandet kan radera det. Jämförelse av den inloggades id och meddelandets id. 
    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only delete your own messages" })
    }

    await message.deleteOne()
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ error: "Could not delete message" })
  }
})

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
