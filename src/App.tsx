import { useState } from 'react'
import './App.css'
import { SignUpLogin } from './components/SignUpLogIn'
import { TUserInformation } from './utils/types'

function App() {
  const [profileData, setProfileData] = useState<TUserInformation | null>(null);

  return (
    <>
      <h1>Retail Sight</h1>
    
      <SignUpLogin setProfileData={setProfileData} />
    </>
  )
}

export default App
