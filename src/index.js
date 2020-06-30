import axios from "axios";

const currencyField = document.querySelectorAll(".two-decimal");

currencyField.forEach((field) => {
  field.onchange = (event) => {
    event.target.value = parseFloat(event.target.value).toFixed(2);
  };
});

const submitButton = document.querySelector(".submit-button");
const saveButton = document.querySelector(".save-button");

submitButton.addEventListener("click", (e) => {
  e.preventDefault();
  const itemInputs = [...document.querySelectorAll(".item-quantity")];
  const items = itemInputs.map((item) => {
    return { id: item.name, quantity: item.valueAsNumber };
  });
  axios.post("create-new/submit", {
    items,
  });
});

saveButton.addEventListener("click", (e) => {
  e.preventDefault();
  const itemInputs = [...document.querySelectorAll(".item-quantity")];
  const items = itemInputs.map((item) => {
    return { id: item.name, quantity: item.valueAsNumber };
  });
  axios.post("create-new/save", {
    items,
  });
});
