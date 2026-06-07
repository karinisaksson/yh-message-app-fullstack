import { useState, useEffect } from "react"
import { BASE_URL } from "./api"
import { PostMessage } from "./components/PostMessage"
import { MessageList } from "./components/MessageList"
import { AuthModal } from "./components/AuthModal"

export const App = () => {
  const [loading, setLoading] = useState(false)
  const [messageList, setMessageList] = useState([])
  const [user, setUser] = useState(null)
  const [modal, setModal] = useState(null)
  const [error, setError] = useState(null)

  //nedan är ny fetchPosts variabel. När vi la till authenticateUser på GET /messages i backenden som en del av säkerhetskrav 3, att endast inloggade ska kunna se meddelanden, behövde frontenden också skicka med JWT-token i varje anrop, annars svarar backenden med 401 och inga meddelanden visas. Funktionen hämtar nu meddelanden från backenden och skickar  med en Authorization-header som innehåller användarens JWT-token. Backenden använder token för att verifiera att användaren är inloggad innan den returnerar meddelandena. Utan token blockeras anropet av authenticateUser-middleware och inga meddelanden skickas tillbaka.
  const fetchPosts = () => {
    setLoading(true)
    fetch(`${BASE_URL}/messages`, {
      headers: {
        Authorization: `Bearer ${user?.response?.accessToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setMessageList(data))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (user) fetchPosts()
  }, [user])

  // ovan har gjorts om för att endast inloggade användare ska kunna se meddelanden. Nedan är den tidigare versionen där fetchPosts kördes varje gång appen laddades, oavsett om en användare var inloggad eller inte. Det är en del av mitt säkerhetskrav 4, alltså att endast autentiserade användare ska kunna se meddelanden.
  //useEffect(() => {
  //  fetchPosts()
  // }, [])

  const addNewPost = (newMessage) => {
    setMessageList([newMessage, ...messageList])
  }

  const handleUnauthorized = () => {
    setUser(null)
    setError("Your session has expired, please log in again")
  }

  return (
    <>
      {user ? (
        <div className="user-info">
          <span>{user.response.username}</span>
          <button
            onClick={() => setUser(null)}
            className="auth-button"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="auth-buttons">
          <button
            onClick={() => setModal("login")}
            className="auth-button"
          >
            Login
          </button>
          <button
            onClick={() => setModal("register")}
            className="auth-button"
          >
            Register
          </button>
        </div>
      )}
      {modal && (
        <AuthModal
          mode={modal}
          onClose={() => setModal(null)}
          onSuccess={(data) => {
            //    console.log("User logged in:", data) - borttagen för att inte exponera token i konsolen, vilket är del av säkerhetskrav 3. det är lättare att komma över en token som exponeras i konsolen och på så sätt ta sig in i en annans konto och kunna ändra eller ta bort meddelanden.
            setUser(data)
            setModal(null)
          }}
        />
      )}
      {error && <p className="error">{error}</p>}
      <PostMessage newMessage={addNewPost} fetchPosts={fetchPosts} user={user} onUnauthorized={handleUnauthorized} />
      {user && <MessageList
        loading={loading}
        messageList={messageList}
        setMessageList={setMessageList}
        fetchPosts={fetchPosts}
        user={user}
        onUnauthorized={handleUnauthorized}
      />}
    </> //La till {user && så att Messagelist bara renderas om användaren är inloggad, så att ej autentiserade användare inte kan se meddelanden — del av säkerhetskrav 3
  )
}
