import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";

export default function PoliticaPrivacidade() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-calm shadow-soft">
              <Lock className="h-6 w-6 text-primary-foreground" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Política de Privacidade</h1>
              <p className="text-sm text-muted-foreground">Versão 1.0 — Junho de 2026</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-foreground space-y-5">

            <section>
              <h2 className="mb-2 font-bold text-base">1. Quem somos</h2>
              <p className="text-muted-foreground">
                O <strong className="text-foreground">Saúde em Sintonia</strong> é um aplicativo de saúde e
                bem-estar. Esta política explica de forma clara quais dados coletamos, por quê, como os
                protegemos e quais são os seus direitos — conforme a Lei Geral de Proteção de Dados (LGPD,
                Lei nº 13.709/2018).
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">2. Quais dados coletamos</h2>
              <p className="mb-2 text-muted-foreground">
                Coletamos apenas o que é necessário para que o aplicativo funcione bem para você:
              </p>
              <div className="space-y-2">
                {[
                  { cat: "Cadastro", items: "Nome, e-mail e senha (criptografada)." },
                  { cat: "Perfil de saúde", items: "Idade, sexo, peso, altura, nível de atividade física e objetivos. Esses dados são opcionais e usados para personalizar sua experiência." },
                  { cat: "Hábitos e bem-estar", items: "Registros diários de humor, energia, hábitos concluídos e treinos realizados." },
                  { cat: "Conversas com o Lucas", items: "Mensagens trocadas com o assistente virtual, armazenadas para manter o histórico das conversas." },
                  { cat: "Uso do aplicativo", items: "Páginas acessadas e funcionalidades usadas — para melhorarmos o produto." },
                  { cat: "Consentimento", items: "Data, horário e versão dos termos aceitos no cadastro." },
                ].map(({ cat, items }) => (
                  <div key={cat} className="rounded-xl bg-muted p-3">
                    <p className="font-semibold text-foreground text-xs mb-0.5">{cat}</p>
                    <p className="text-muted-foreground text-xs">{items}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">3. Para que usamos seus dados</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Personalizar seus hábitos, treinos e sugestões da IA</li>
                <li>Manter seu histórico de progresso e conquistas</li>
                <li>Enviar notificações de lembrete (somente se você ativar)</li>
                <li>Melhorar continuamente o aplicativo</li>
                <li>Cumprir obrigações legais quando exigido</li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                <strong className="text-foreground">Não vendemos seus dados</strong> para ninguém.
                Nunca. Simples assim.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">4. Dados sensíveis de saúde</h2>
              <p className="text-muted-foreground">
                Informações sobre saúde mental, humor, peso e objetivos são consideradas{" "}
                <strong className="text-foreground">dados sensíveis</strong> pela LGPD.
                Tratamos esses dados com cuidado extra: acesso restrito, criptografia em
                trânsito (HTTPS) e armazenamento seguro no Supabase. Eles são usados
                exclusivamente para personalizar sua experiência dentro do app.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">5. Como protegemos seus dados</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Toda comunicação é criptografada (HTTPS/TLS)</li>
                <li>Senhas são armazenadas com hashing seguro — nunca em texto puro</li>
                <li>Acesso ao banco de dados restrito por políticas de segurança (RLS)</li>
                <li>Apenas você acessa seus próprios dados</li>
                <li>Tokens de sessão expiram e são renovados automaticamente</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">6. Compartilhamento de dados</h2>
              <p className="text-muted-foreground">
                Compartilhamos dados apenas com fornecedores de tecnologia essenciais para
                o funcionamento do app:
              </p>
              <ul className="list-disc pl-5 mt-2 text-muted-foreground space-y-1">
                <li><strong className="text-foreground">Supabase</strong> — banco de dados e autenticação (servidores na região da América do Sul)</li>
                <li><strong className="text-foreground">OpenAI</strong> — processamento das respostas do Amigo Lucas (suas mensagens são enviadas de forma segura e não são usadas para treinar modelos)</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">7. Seus direitos (LGPD)</h2>
              <p className="mb-2 text-muted-foreground">Você tem o direito de:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li><strong className="text-foreground">Acessar</strong> seus dados — você pode vê-los na tela de Perfil</li>
                <li><strong className="text-foreground">Corrigir</strong> dados incorretos — edite diretamente no aplicativo</li>
                <li><strong className="text-foreground">Excluir</strong> sua conta e todos os dados — disponível em Configurações</li>
                <li><strong className="text-foreground">Revogar o consentimento</strong> — ao excluir sua conta</li>
                <li><strong className="text-foreground">Portabilidade</strong> — solicite seus dados por e-mail</li>
                <li><strong className="text-foreground">Saber quem acessa</strong> — apenas nossa equipe técnica, em casos de suporte</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">8. Retenção de dados</h2>
              <p className="text-muted-foreground">
                Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão,
                os dados são removidos permanentemente em até <strong className="text-foreground">30 dias</strong>.
                Logs técnicos podem ser mantidos por até 90 dias por razões de segurança.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">9. Cookies e armazenamento local</h2>
              <p className="text-muted-foreground">
                Usamos o armazenamento local do seu dispositivo (localStorage) apenas para
                salvar preferências como tema (claro/escuro) e configurações de notificação.
                Não usamos cookies de rastreamento ou publicidade.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">10. Menores de idade</h2>
              <p className="text-muted-foreground">
                O aplicativo não é direcionado a menores de 13 anos. Se você tem entre 13 e 17 anos,
                recomendamos usar com o conhecimento de um responsável.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">11. Contato</h2>
              <p className="text-muted-foreground">
                Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato:{" "}
                <a href="mailto:privacidade@saudeemsintoniaapp.com"
                  className="text-primary underline-offset-4 hover:underline">
                  privacidade@saudeemsintoniaapp.com
                </a>
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
