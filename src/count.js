import axios from "axios";

const submitButton = document.querySelector(".submit-button");
const saveButton = document.querySelector(".save-button");

submitButton.addEventListener("click", (e) => {
  e.preventDefault();
  const itemInputs = [...document.querySelectorAll(".item-quantity")];
  const items = itemInputs.map((item) => {
    return { id: item.name, quantity: item.valueAsNumber };
  });
  const filterEl = document.querySelector("#filter");
  const filter = filterEl.value;
  axios
    .post("create-new/submit", {
      items,
      filter,
    })
    .then((response) => {
      window.location = response.data.redirect;
      // const { res, action, target, template, props } = response.data;
      // if (action === "redirect") {
      //   window.location = target;
      // }
      // if (action === "render") {
      //   res.render(template, props);
      // }
    });
});

saveButton.addEventListener("click", (e) => {
  e.preventDefault();
  const itemInputs = [...document.querySelectorAll(".item-quantity")];
  const items = itemInputs.map((item) => {
    return { id: item.name, quantity: item.valueAsNumber };
  });
  const filterEl = document.querySelector("#filter");
  const filter = filterEl.value;
  axios.post("create-new/save", {
    items,
    filter,
  });
});
