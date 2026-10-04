import { Lock } from "lucide-react";
import { Contato, PaginaLegal } from "@/components/PaginaLegal";

export default function PoliticaPrivacidade() {
  return (
    <PaginaLegal icone={Lock} titulo="Política de Privacidade" versao="Versão 2.0 · outubro de 2026">
      <section>
        <h2>1. Sobre o Saúde++</h2>
        <p>
          O Saúde++ é um projeto independente e de código aberto, feito para estudo e portfólio. Esta política explica
          quais dados o app guarda, para quê, com quem eles são compartilhados e como você controla tudo isso, conforme a
          Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).
        </p>
      </section>

      <section>
        <h2>2. Dados que guardamos</h2>
        <ul>
          <li><strong>Conta:</strong> nome, e-mail e senha (guardada pelo Supabase Auth só em forma de hash).</li>
          <li><strong>Perfil:</strong> nickname, foto e, se você quiser informar, idade, sexo, peso, altura, nível de atividade, estresse, sono, humor, rotina e objetivos.</li>
          <li><strong>Uso diário:</strong> hábitos, check-ins de humor e energia, treinos, cargas e medidas corporais.</li>
          <li><strong>Conversas com o Lucas:</strong> as mensagens e respostas, para manter o histórico.</li>
          <li><strong>Social:</strong> amizades, pedidos e desafios entre amigos.</li>
          <li><strong>Lembretes:</strong> o endereço de notificação do navegador e o horário escolhido, se você ativar.</li>
          <li><strong>Métricas de uso:</strong> tipo de ação (por exemplo, "marcou um hábito"), sem o conteúdo de mensagens.</li>
          <li><strong>Consentimento:</strong> data e versão dos termos aceitos no cadastro.</li>
        </ul>
      </section>

      <section>
        <h2>3. Dados sensíveis</h2>
        <p>
          Informações sobre saúde física e mental são <strong>dados sensíveis</strong> pela LGPD e só são tratadas com o
          seu consentimento, dado no cadastro. Elas servem apenas para personalizar hábitos, treinos e conversas. Nada
          disso é vendido ou usado para publicidade.
        </p>
      </section>

      <section>
        <h2>4. Inteligência artificial (Google Gemini)</h2>
        <p>
          Para gerar hábitos, treinos e as respostas do Lucas, o app envia ao <strong>Google Gemini</strong> o texto
          necessário: suas mensagens, o histórico recente da conversa e as informações de perfil relevantes para o
          pedido. A chamada sai do nosso servidor, nunca do seu navegador.
        </p>
        <p className="mt-2">
          O projeto usa o <strong>nível gratuito</strong> da API do Gemini. Nesse nível, segundo os termos do Google, o
          conteúdo enviado <strong>pode ser usado para melhorar os produtos do Google e revisado por pessoas</strong>.
          Por isso, não escreva para o Lucas dados que identifiquem você ou outras pessoas, como documentos, endereço
          ou telefone.
        </p>
      </section>

      <section>
        <h2>5. Quem mais vê seus dados</h2>
        <ul>
          <li><strong>Supabase:</strong> banco de dados, autenticação e arquivos. Os servidores ficam nos Estados Unidos (região us-west-2), o que caracteriza transferência internacional de dados.</li>
          <li><strong>Google (Gemini):</strong> como descrito na seção 4.</li>
          <li><strong>Hostinger:</strong> hospeda os arquivos do site; não recebe seus dados de saúde.</li>
          <li><strong>Outras pessoas do app:</strong> quem busca seu nickname vê nome, nickname e foto. Progresso e sequência aparecem conforme suas opções de privacidade. Dados físicos, de saúde mental e objetivos aparecem só para amigos, e só se você ativar.</li>
        </ul>
      </section>

      <section>
        <h2>6. Segurança</h2>
        <ul>
          <li>Comunicação sempre criptografada (HTTPS).</li>
          <li>Regras no banco (Row Level Security) garantem que cada pessoa acesse só os próprios dados.</li>
          <li>A chave da IA e as chaves administrativas ficam só no servidor.</li>
        </ul>
        <p className="mt-2">Nenhum sistema é infalível; se você suspeitar de um problema, avise pelo contato abaixo.</p>
      </section>

      <section>
        <h2>7. Seus direitos</h2>
        <ul>
          <li><strong>Acesso e correção:</strong> veja e edite seus dados nas telas de Perfil e Configurações.</li>
          <li><strong>Exclusão:</strong> em Configurações, "Excluir conta e dados" apaga a conta e tudo o que está ligado a ela na hora.</li>
          <li><strong>Revogação do consentimento:</strong> feita pela exclusão da conta.</li>
          <li><strong>Portabilidade e dúvidas:</strong> peça pelo contato abaixo.</li>
        </ul>
      </section>

      <section>
        <h2>8. Por quanto tempo</h2>
        <p>
          Os dados ficam guardados enquanto a conta existir. Depois da exclusão, só podem restar cópias de segurança
          automáticas do provedor, que expiram sozinhas.
        </p>
      </section>

      <section>
        <h2>9. Armazenamento no aparelho</h2>
        <p>
          O app guarda no navegador a sessão de login e preferências como tema e horário do lembrete. Não usamos cookies
          de rastreamento nem de publicidade.
        </p>
      </section>

      <section>
        <h2>10. Idade mínima</h2>
        <p>O Saúde++ não é destinado a menores de 13 anos. Entre 13 e 17 anos, use com o conhecimento de um responsável.</p>
      </section>

      <section>
        <h2>11. Contato</h2>
        <p>
          Dúvidas ou pedidos sobre seus dados: <Contato />.
        </p>
      </section>
    </PaginaLegal>
  );
}
