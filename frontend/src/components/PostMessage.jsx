import { useState } from "react"
import { BASE_URL } from "../api"

export const PostMessage = ({ newMessage, fetchPosts, user, onUnauthorized }) => {
  const [newPost, setNewPost] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleFormSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)

    //  detta sätts in för att validera i frontenden att meddelandet är mellan 3 och 140 tecken, och att användaren inte kan skicka in ett tomt meddelande. 
    // if (newPost.length < 3 || newPost.length > 140) {
    //    setErrorMessage("Message must be between 3 and 140 characters")
    //    setSubmitting(false)
    //    return
    //  }

    try {
      const res = await fetch(`${BASE_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.response?.accessToken}`,
        },
        body: JSON.stringify({ message: newPost }),
      })

      // tar bort denna console.log för att inte token ska kunna ses i konsolen. det är en del av mitt säkerhetskrav 3, eftersom det är lättare att komma över en token som exponeras i konsolen och på så sätt ta sig in i en annans konto och kunna ändra eller ta bort meddelanden.
      //    console.log("Token being sent:", user?.response?.accessToken)

      if (res.status === 401) {
        onUnauthorized()
        setSubmitting(false)
        return
      }

      const data = await res.json()

      if (data.message && !data._id) {
        console.log(data)
        setErrorMessage(data.message)
        setSubmitting(false)
        return
      }

      newMessage(data)
      setNewPost("")
      setErrorMessage("")
      setSubmitting(false)
      await fetchPosts()
    } catch (error) {
      console.error(error)
      setSubmitting(false)
    }
  }

  if (!user) {
    return <p id="login-prompt">Log in to see and write messages</p>
  } // Om man inte är inloggad renderas inte formuläret för att skriva meddelanden. Meddelandet ändrat för att förtydliga att användaren måste logga in för att både se och skriva meddelanden.

  return (
    <div id="post-form-wrapper" className="post-wrapper">
      <p>What's making you happy right now?</p>
      <form id="post-form" onSubmit={handleFormSubmit}>
        <textarea
          id="post-textarea"
          rows="3"
          placeholder="Write your message here..."
          value={newPost}
          onChange={(e) => {
            setNewPost(e.target.value)
            setErrorMessage("")
          }}
        />
        <p className="error" id="post-error">{errorMessage}</p>
        <button
          type="submit"
          id="submit-post-btn"
          aria-label="button for submitting your post"
          disabled={submitting}
        >
          <span className="emoji">&#x2665;</span>
          Send message
          <span className="emoji">&#x2665;</span>
        </button>
      </form>
    </div>
  )
}
