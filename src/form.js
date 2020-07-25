const form = document.querySelector("form");
const passwordGroup = document.querySelector("#password-group");
const formGroups = [...document.querySelectorAll(".form-group")];

form.addEventListener("submit", (e) => {
  if ([...passwordGroup.classList].includes("hidden")) {
    e.preventDefault();
    formGroups.forEach((formGroup) => formGroup.classList.toggle("hidden"));
  }
});
