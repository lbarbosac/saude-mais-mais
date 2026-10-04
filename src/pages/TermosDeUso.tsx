import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Contato, PaginaLegal } from "@/components/PaginaLegal";

export default function TermosDeUso() {
  return (
    <PaginaLegal icone={FileText} titulo="Termos de Uso" versao="Versão 2.0 · outubro de 2026">
      <section>
        <h2>1. O que é o Saúde++</h2>
        <p>
          O Saúde++ é um app gratuito e de código aberto para criar hábitos saudáveis, registrar treinos e humor,
          acompanhar o próprio progresso e conversar com o Lucas, um assistente de inteligência artificial. É um projeto
          independente, de estudo e portfólio. <strong>Não é um serviço de saúde.</strong>
        </p>
      </section>

      <section>
        <h2>2. Aceite</h2>
        <p>
          Ao criar uma conta você concorda com estes termos e com a{" "}
          <Link to="/privacidade" className="text-primary underline-offset-4 hover:underline">Política de Privacidade</Link>.
          O app não é destinado a menores de 13 anos.
        </p>
      </section>

      <section>
        <h2>3. O Lucas e as sugestões da IA</h2>
        <p>
          O Lucas e as listas de hábitos e treinos são gerados por inteligência artificial (Google Gemini). Eles podem
          errar e <strong>não substituem médicos, psicólogos, nutricionistas ou educadores físicos</strong>. Não use o
          app para diagnóstico ou tratamento, e procure um profissional antes de mudar remédios, dieta ou treinos de forma
          importante.
        </p>
        <p className="mt-2">
          Se você estiver em sofrimento ou pensando em se machucar, ligue para o <strong>CVV, 188</strong> (gratuito, 24
          horas) ou acesse cvv.org.br. Em emergência, ligue <strong>192</strong> (SAMU).
        </p>
      </section>

      <section>
        <h2>4. Uso permitido</h2>
        <ul>
          <li>Use o app para cuidar de você e interagir com amigos de forma respeitosa.</li>
          <li>Não crie contas falsas nem se passe por outra pessoa.</li>
          <li>Não publique conteúdo ofensivo ou ilegal em nomes, desafios ou fotos.</li>
          <li>Não tente burlar a segurança, sobrecarregar o serviço ou acessar dados de terceiros.</li>
        </ul>
      </section>

      <section>
        <h2>5. Sua conta</h2>
        <p>
          Você é responsável por manter sua senha segura. Pode excluir a conta quando quiser, em Configurações; a exclusão
          apaga seus dados na hora.
        </p>
      </section>

      <section>
        <h2>6. Disponibilidade</h2>
        <p>
          O app é oferecido como está, sem garantia de funcionamento contínuo. Recursos de IA dependem de serviços de
          terceiros com limites de uso gratuito e podem ficar indisponíveis temporariamente.
        </p>
      </section>

      <section>
        <h2>7. Mudanças</h2>
        <p>Estes termos podem mudar. A versão e a data ficam no topo desta página.</p>
      </section>

      <section>
        <h2>8. Contato</h2>
        <p>
          Dúvidas: <Contato />.
        </p>
      </section>
    </PaginaLegal>
  );
}
