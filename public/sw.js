// Service worker do Saúde++.
//
// Cache só do próprio app (HTML, JS, CSS, ícones). Nada de outro domínio é
// guardado: a versão anterior cacheava toda requisição GET, inclusive as
// respostas da API do Supabase com dados pessoais, que continuavam no aparelho
// mesmo depois do logout.

const VERSAO = "saude-v2";
const ESSENCIAIS = ["/", "/manifest.json", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ESSENCIAIS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: rede primeiro (pega sempre o index.html novo depois de um
  // deploy); sem rede, cai no app guardado.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put("/", copia));
          return resposta;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Arquivos com hash no nome nunca mudam: cache primeiro.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (guardado) =>
          guardado ||
          fetch(request).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(VERSAO).then((cache) => cache.put(request, copia));
            }
            return resposta;
          }),
      ),
    );
  }
});

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch (e) {
    dados = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(dados.title || "Saúde++", {
      body: dados.body || "Hora de cuidar de você.",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: dados.tag || "saude",
      data: { url: dados.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((j) => j.url.startsWith(self.location.origin));
      if (aberta) {
        aberta.navigate(destino);
        return aberta.focus();
      }
      return self.clients.openWindow(destino);
    }),
  );
});
