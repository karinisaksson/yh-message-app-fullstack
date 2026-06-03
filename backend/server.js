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

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set in .env")

const PORT = process.env.PORT || "3000"
const app = express()
app.use(helmet())
app.use(cors({
  origin: "*", // vilken webbsida som helst på internet kan skicka requests till min API. kan blir ett säkerhetsproblem. tillåter alla domäner att skicka requests till API:et, vilket är dålig praxis i produktion men inte direkt kopplat till något av mina säkerhetskrav.
  // bör ändras till app.use(cors({origin: min-frontends-url}))

}))
app.use(express.json())

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
    // här hashas lösenord med bcrypt innan det sparas i databasen, vilket åtgärdar säkerhetsåtgärd 5. 
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

app.post("/login", async (req, res) => {
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

    // här jämförs det angivna lösenordet som hashas med det hashade lösenordet i databasen, vilket är en del av säkerhetsåtgärd 5. 
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

//lagt till authenticateUser i app.get("/messages") så att endast inloggade användare kan se meddelanden. Det är en del av mitt säkerhetskrav 3, alltså att endast inloggade användare ska kunna se meddelanden.
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
//att authenicateUser finns med i app.post, gör att det krävs en giltig token för att skriva ett meddelande. Detta fanns redan med i koden från början. Uppfyller säkerhetskrav 3. 
app.post("/messages", authenticateUser, async (req, res) => {
  const text = req.body.message
  if (!text || text.length < 3 || text.length > 140) {
    return res.status(400).json({ message: "Message must be between 3 and 140 characters" }) // detta är en del av säkerhetskrav 10, begränsing av längd på meddelanden.
  }
  const message = new Message({ message: req.body.message, user: req.user._id })
  try {
    const saved = await message.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: "Could not save message", errors: err.errors })
  }
})

//backend: Att authenicateUser finns med i app.patch(“/messages/:id gör att det krävs en giltig token för att skriva ett meddelande. Detta fanns redan med i koden från början.
app.patch("/messages/:id", authenticateUser, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })

    //här under säkerställs att endast ägaren av meddelandet kan redigera det, annars kan vem som helst redigera alla meddelanden. detta var med i koden från början och uppfyller säkerhetskrav 4.
    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only edit your own messages" })
    }
    // här lägger jag till en kontroll för att säkerställa att meddelandet är mellan 3 och 140 tecken, annars kan användare skicka in väldigt långa eller väldigt korta meddelanden. Detta är en del av säkerhetskrav 10.
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

// La till authenticateUser. Det löser delvis krav 4, alltså att ägarskap ska kontrolleras innan radering av meddelanden. 
app.delete("/messages/:id", authenticateUser, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })

    // här lägger jag till en kontroll för att säkerställa att endast ägaren av meddelandet kan radera det, annars kan vem som helst radera alla meddelanden. Säkerhetskrav 4. 
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
