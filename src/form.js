const formTop = document.querySelector(".form-top");
const passwordGroupTop = document.querySelector(".password-group-top");
const formGroupsTop = [...document.querySelectorAll(".form-group-top")];

formTop.addEventListener("submit", (e) => {
  if ([...passwordGroupTop.classList].includes("hidden")) {
    e.preventDefault();
    formGroupsTop.forEach((formGroup) => formGroup.classList.toggle("hidden"));
  }
});

const formBotton = document.querySelector(".form-bottom");
const passwordGroupBotton = document.querySelector(".password-group-bottom");
const formGroupsBotton = [...document.querySelectorAll(".form-group-bottom")];

formBotton.addEventListener("submit", (e) => {
  if ([...passwordGroupBotton.classList].includes("hidden")) {
    e.preventDefault();
    formGroupsBotton.forEach((formGroup) =>
      formGroup.classList.toggle("hidden")
    );
  }
});
