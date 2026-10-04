// Aplica o tema antes do React carregar, para não piscar a tela clara.
// Mesma regra de src/lib/tema.ts.
(function () {
  var pref = "sistema";
  try {
    pref = localStorage.getItem("saude-theme") || "sistema";
  } catch (e) {}
  var escuro = pref === "escuro" || (pref !== "claro" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (escuro) document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = escuro ? "dark" : "light";
})();
