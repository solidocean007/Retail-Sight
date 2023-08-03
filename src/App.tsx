import { useState } from 'react'
import './App.css'
import { SignUpLogin } from './components/SignUpLogIn'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Retail Sight</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <SignUpLogin />
    </>
  )
}

export default App
