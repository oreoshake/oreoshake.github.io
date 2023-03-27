// Immediately-invoked function expression
(function() {
  // Load the script
  const script = document.createElement("script");
  script.src = 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js';
  script.type = 'text/javascript';
  script.addEventListener('load', () => {
    console.log(`jQuery ${$.fn.jquery} has been loaded successfully!`);
    // use jQuery below
  });
  document.head.appendChild(script);
})();


const parseCookie = str =>
  str
    .split(';')
    .map(v => v.split('='))
    .reduce((acc, v) => {
      acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
      return acc;
    }, {});

const email = parseCookie(document.cookie)['logged_in_user'];
const admin = parseCookie(document.cookie)['admin_user'];

const message = "### Congratulations" + email + ", you've won $1,000!!! ###\n " + (admin ? 'And an extra $500 for being an admin' : 'You could earn more money if you were an admin')

alert(message)

$('head').append("<style>body { -webkit-transform: rotate(180deg) translate(0, -" + ($(document).height() - $(window).height()) + "px) }</style>");
