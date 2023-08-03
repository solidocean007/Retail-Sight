import { ChangeEventHandler, useRef } from "react";
import { TUserInputType } from "../utils/types";
import { TPhoneInputState } from "../utils/types";
import { validateUserInputs } from "../utils/validations";
import { TErrorsOfInputs } from "../utils/types";

export const UserPhoneInput = ({
  userInputs,
  setUserInputs,
  setErrorsOfInputs,
}: {
  userInputs: TUserInputType;
  setUserInputs: (userInputs: TUserInputType) => void;
  setErrorsOfInputs: (errorsOfInputs: TErrorsOfInputs) => void;
}) => {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const ref0 = refs[0];
  const ref1 = refs[1];
  const ref2 = refs[2];

  const createOnChangeHandler =
    (index: 0 | 1 | 2 | 3): ChangeEventHandler<HTMLInputElement> =>
    (e) => {
      const lengths = [3, 3, 4];
      const currentMaxLength = lengths[index];
      const nextRef = refs[index + 1];
      const prevRef = refs[index - 1];
      const value = e.target.value;

      if (index === 2 && value.length > currentMaxLength) {
        return;
      }

      if (/^\d+$/.test(value) || value === "") {
        const shouldGoToNextRef =
          value.length === currentMaxLength && nextRef?.current;
        const shouldGoToPrevRef = value.length === 0;

        const newState = userInputs.phoneInput.map(
          (phoneInput, phoneInputIndex) =>
            index === phoneInputIndex ? value : phoneInput
        ) as TPhoneInputState;

        if (shouldGoToNextRef) {
          nextRef?.current?.focus();
        }

        if (shouldGoToPrevRef) {
          prevRef?.current?.focus();
        }

        setUserInputs({
          ...userInputs,
          phoneInput: newState,
        });

        // Validate input after setting state and update error state
        const validationErrors = validateUserInputs({
          ...userInputs,
          phoneInput: newState,
        });
        setErrorsOfInputs(validationErrors);
      }
    };

  return (
    <div id="phone-input-wrap">
      <label htmlFor="">Phone</label>
      <input
        id="phone-input-1"
        type="text"
        ref={ref0}
        value={userInputs.phoneInput[0]}
        onChange={createOnChangeHandler(0)}
      />
      -
      <input
        id="phone-input-2"
        type="text"
        ref={ref1}
        value={userInputs.phoneInput[1]}
        onChange={createOnChangeHandler(1)}
      />
      -
      <input
        id="phone-input-3"
        type="text"
        ref={ref2}
        value={userInputs.phoneInput[2]}
        onChange={createOnChangeHandler(2)}
      />
    </div>
  );
};