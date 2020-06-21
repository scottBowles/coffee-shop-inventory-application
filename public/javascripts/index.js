const currencyField = document.querySelectorAll(".two-decimal");

currencyField.forEach((field) => {
  field.onchange = (event) => {
    event.target.value = parseFloat(event.target.value).toFixed(2);
  };
});
