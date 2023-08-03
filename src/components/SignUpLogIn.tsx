import { useState } from "react";
import { UserInput } from "./UserInput";


export const SignUpLogin = () => {

  const [userInputs, setUserInputs] = useState({
    firstNameInput: '',
    lastNameInput: '',
    companyInput: '',
    phoneInput: ['','',''],
  });

  const NewUserProperties = ['First Name', 'Last Name', 'Company', 'Phone number'];

  const handleInputChange = (name: string, value: string) => {
    setUserInputs((prevState) => ({ ...prevState, [name]: value }));
  };

  return (
    <div className="signUp-login-form">
      {NewUserProperties.map((item, index)=>(
        <div key={index}>
          <UserInput 
            labelText={item}
            inputProps={{
              type: 'text',
              onChange: (e) => {
                handleInputChange(item, e.target.value);
              }
            }}
          />
        </div>
      ))}
    </div>
  )
}