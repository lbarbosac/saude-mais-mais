import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function TermosDeUso() {
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-hero shadow-soft">
              <Shield className="h-6 w-6 text-primary-foreground" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Termos de Uso</h1>
              <p className="text-sm text-muted-foreground">Versão 1.0 — Junho de 2026</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-foreground space-y-5">
            <section>
              <h2 className="mb-2 font-bold text-base">1. Sobre o aplicativo</h2>
              <p className="text-muted-foreground">
                O <strong className="text-foreground">Saúde em Sintonia</strong> é um aplicativo de saúde e bem-estar
                que te ajuda a criar hábitos saudáveis, acompanhar seu progresso e conversar com o assistente virtual
                Lucas sobre saúde mental e física. Somos desenvolvidos por uma equipe independente e não somos
                um serviço médico.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">2. Aceitação dos termos</h2>
              <p className="text-muted-foreground">
                Ao criar uma conta e usar o Saúde em Sintonia, você concorda com estes termos.
                Se você tiver menos de 13 anos, não use este aplicativo sem a supervisão de um responsável.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">3. O que você pode fazer</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Criar uma conta pessoal e usar todas as funcionalidades</li>
                <li>Acompanhar seus hábitos, treinos e bem-estar</li>
                <li>Conversar com o Lucas sobre saúde mental e física</li>
                <li>Conectar-se com amigos e participar de desafios</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">4. O que você não pode fazer</h2>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Criar contas falsas ou usar o aplicativo em nome de outra pessoa</li>
                <li>Compartilhar conteúdo ofensivo, ilegal ou que prejudique outros usuários</li>
                <li>Tentar invadir, sobrecarregar ou comprometer a segurança do aplicativo</li>
                <li>Usar o Lucas como substituto de tratamento médico profissional</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">5. Sobre o Amigo Lucas</h2>
              <p className="text-muted-foreground">
                O Lucas é um assistente virtual movido por inteligência artificial. Ele oferece
                informações gerais sobre saúde e bem-estar, mas <strong className="text-foreground">não substitui
                a orientação de médicos, psicólogos ou outros profissionais de saúde</strong>.
                Em emergências de saúde mental, ligue para o CVV: <strong className="text-foreground">188</strong> (gratuito, 24h).
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">6. Conta e segurança</h2>
              <p className="text-muted-foreground">
                Você é responsável por manter sua senha segura. Não compartilhe seu acesso com outras pessoas.
                Se perceber atividade estranha na sua conta, entre em contato conosco imediatamente.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">7. Cancelamento e exclusão</h2>
              <p className="text-muted-foreground">
                Você pode excluir sua conta a qualquer momento pelas configurações do aplicativo.
                Todos os seus dados pessoais serão removidos permanentemente em até 30 dias,
                conforme previsto na LGPD.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">8. Limitação de responsabilidade</h2>
              <p className="text-muted-foreground">
                O aplicativo é fornecido como está, sem garantias de disponibilidade contínua.
                Não nos responsabilizamos por decisões de saúde tomadas com base exclusivamente
                nas informações do aplicativo.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">9. Alterações nos termos</h2>
              <p className="text-muted-foreground">
                Podemos atualizar estes termos. Quando isso acontecer, você será notificado
                pelo aplicativo e poderá revisar as mudanças antes de continuar usando.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-base">10. Contato</h2>
              <p className="text-muted-foreground">
                Dúvidas sobre estes termos? Fale conosco pelo e-mail:{" "}
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
