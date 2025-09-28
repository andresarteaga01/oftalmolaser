document.addEventListener('DOMContentLoaded', function () {
  const passwordFields = ['#id_password1', '#id_password2'];

  passwordFields.forEach(function (selector) {
    const input = document.querySelector(selector);
    if (input) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.innerText = '👁️';
      toggle.style.marginLeft = '8px';
      toggle.classList.add('password-toggle');

      toggle.addEventListener('click', function () {
        input.type = input.type === 'password' ? 'text' : 'password';
      });

      input.parentNode.appendChild(toggle);
    }
  });
});