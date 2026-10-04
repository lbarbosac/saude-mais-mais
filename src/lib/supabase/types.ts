// Gerado a partir do schema do banco. Não edite à mão.
// Para atualizar: npx supabase gen types typescript --project-id <ref> --schema public > src/lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      amizades: {
        Row: {
          amigo_id: string
          created_at: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amigo_id: string
          created_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amigo_id?: string
          created_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_eventos: {
        Row: {
          app_version: string
          created_at: string
          event_name: string
          id: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          app_version?: string
          created_at?: string
          event_name: string
          id?: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          app_version?: string
          created_at?: string
          event_name?: string
          id?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string
          user_id?: string | null
        }
        Relationships: []
      }
      checkin_diario: {
        Row: {
          created_at: string | null
          data: string
          energia: string | null
          humor: string | null
          id: string
          observacao: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: string
          energia?: string | null
          humor?: string | null
          id?: string
          observacao?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: string
          energia?: string | null
          humor?: string | null
          id?: string
          observacao?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      consentimento_lgpd: {
        Row: {
          aceito: boolean
          created_at: string
          id: string
          ip_address: string | null
          tipo: string
          user_id: string
          versao: string
        }
        Insert: {
          aceito?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          tipo: string
          user_id: string
          versao?: string
        }
        Update: {
          aceito?: boolean
          created_at?: string
          id?: string
          ip_address?: string | null
          tipo?: string
          user_id?: string
          versao?: string
        }
        Relationships: []
      }
      consentimento_usuario: {
        Row: {
          aceito_em: string
          id: string
          ip_hash: string | null
          user_agent: string | null
          user_id: string
          versao_termos: string
        }
        Insert: {
          aceito_em?: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id: string
          versao_termos?: string
        }
        Update: {
          aceito_em?: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id?: string
          versao_termos?: string
        }
        Relationships: []
      }
      conversas_lucas: {
        Row: {
          created_at: string | null
          id: string
          titulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          titulo?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          titulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      desafio_progresso_log: {
        Row: {
          created_at: string
          desafio_id: string
          id: string
          progresso_anterior: number
          progresso_novo: number
          user_id: string
        }
        Insert: {
          created_at?: string
          desafio_id: string
          id?: string
          progresso_anterior: number
          progresso_novo: number
          user_id: string
        }
        Update: {
          created_at?: string
          desafio_id?: string
          id?: string
          progresso_anterior?: number
          progresso_novo?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "desafio_progresso_log_desafio_id_fkey"
            columns: ["desafio_id"]
            isOneToOne: false
            referencedRelation: "desafios"
            referencedColumns: ["id"]
          },
        ]
      }
      desafios: {
        Row: {
          confirmacao_criador: boolean
          confirmacao_desafiado: boolean
          created_at: string | null
          criador_id: string
          data_fim: string | null
          desafiado_id: string
          descricao: string | null
          flag_suspeito: boolean
          id: string
          meta: number
          motivo_flag: string | null
          progresso_criador: number
          progresso_desafiado: number
          prova_criador_path: string | null
          prova_desafiado_path: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          confirmacao_criador?: boolean
          confirmacao_desafiado?: boolean
          created_at?: string | null
          criador_id: string
          data_fim?: string | null
          desafiado_id: string
          descricao?: string | null
          flag_suspeito?: boolean
          id?: string
          meta?: number
          motivo_flag?: string | null
          progresso_criador?: number
          progresso_desafiado?: number
          prova_criador_path?: string | null
          prova_desafiado_path?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          confirmacao_criador?: boolean
          confirmacao_desafiado?: boolean
          created_at?: string | null
          criador_id?: string
          data_fim?: string | null
          desafiado_id?: string
          descricao?: string | null
          flag_suspeito?: boolean
          id?: string
          meta?: number
          motivo_flag?: string | null
          progresso_criador?: number
          progresso_desafiado?: number
          prova_criador_path?: string | null
          prova_desafiado_path?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      habito_registro: {
        Row: {
          concluido: boolean
          created_at: string | null
          data: string
          habito_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string | null
          data?: string
          habito_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concluido?: boolean
          created_at?: string | null
          data?: string
          habito_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habito_registro_habito_id_fkey"
            columns: ["habito_id"]
            isOneToOne: false
            referencedRelation: "habitos"
            referencedColumns: ["id"]
          },
        ]
      }
      habitos: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          descricao: string | null
          gerado_por_ia: boolean
          icone: string
          id: string
          nome_habito: string
          ultima_exibicao: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          gerado_por_ia?: boolean
          icone?: string
          id?: string
          nome_habito: string
          ultima_exibicao?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          gerado_por_ia?: boolean
          icone?: string
          id?: string
          nome_habito?: string
          ultima_exibicao?: string | null
          user_id?: string
        }
        Relationships: []
      }
      medidas_corporais: {
        Row: {
          bracos_dir: number | null
          bracos_esq: number | null
          cintura: number | null
          created_at: string | null
          data: string
          gluteo: number | null
          id: string
          peito: number | null
          percent_gordura: number | null
          perna_dir: number | null
          perna_esq: number | null
          pescoco: number | null
          peso: number | null
          quadril: number | null
          user_id: string
        }
        Insert: {
          bracos_dir?: number | null
          bracos_esq?: number | null
          cintura?: number | null
          created_at?: string | null
          data?: string
          gluteo?: number | null
          id?: string
          peito?: number | null
          percent_gordura?: number | null
          perna_dir?: number | null
          perna_esq?: number | null
          pescoco?: number | null
          peso?: number | null
          quadril?: number | null
          user_id: string
        }
        Update: {
          bracos_dir?: number | null
          bracos_esq?: number | null
          cintura?: number | null
          created_at?: string | null
          data?: string
          gluteo?: number | null
          id?: string
          peito?: number | null
          percent_gordura?: number | null
          perna_dir?: number | null
          perna_esq?: number | null
          pescoco?: number | null
          peso?: number | null
          quadril?: number | null
          user_id?: string
        }
        Relationships: []
      }
      mensagens_lucas: {
        Row: {
          conteudo: string
          conversa_id: string
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          conteudo: string
          conversa_id: string
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          conteudo?: string
          conversa_id?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_lucas_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas_lucas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_usuario: {
        Row: {
          altura: number | null
          avatar_url: string | null
          created_at: string
          humor_geral: string | null
          id: string
          idade: number | null
          nickname: string | null
          nivel_atividade: string | null
          nivel_estresse: string | null
          nome: string
          objetivo: string | null
          onboarding_completo: boolean
          peso: number | null
          profile_private: boolean
          qualidade_sono: string | null
          rotina: string | null
          sexo: string | null
          show_dados_fisicos: boolean
          show_habits: boolean
          show_objetivos: boolean
          show_progress: boolean
          show_saude_mental: boolean
          show_streak: boolean
          sobre_voce: string | null
          tempo_livre: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          altura?: number | null
          avatar_url?: string | null
          created_at?: string
          humor_geral?: string | null
          id?: string
          idade?: number | null
          nickname?: string | null
          nivel_atividade?: string | null
          nivel_estresse?: string | null
          nome?: string
          objetivo?: string | null
          onboarding_completo?: boolean
          peso?: number | null
          profile_private?: boolean
          qualidade_sono?: string | null
          rotina?: string | null
          sexo?: string | null
          show_dados_fisicos?: boolean
          show_habits?: boolean
          show_objetivos?: boolean
          show_progress?: boolean
          show_saude_mental?: boolean
          show_streak?: boolean
          sobre_voce?: string | null
          tempo_livre?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          altura?: number | null
          avatar_url?: string | null
          created_at?: string
          humor_geral?: string | null
          id?: string
          idade?: number | null
          nickname?: string | null
          nivel_atividade?: string | null
          nivel_estresse?: string | null
          nome?: string
          objetivo?: string | null
          onboarding_completo?: boolean
          peso?: number | null
          profile_private?: boolean
          qualidade_sono?: string | null
          rotina?: string | null
          sexo?: string | null
          show_dados_fisicos?: boolean
          show_habits?: boolean
          show_objetivos?: boolean
          show_progress?: boolean
          show_saude_mental?: boolean
          show_streak?: boolean
          sobre_voce?: string | null
          tempo_livre?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      preferencias_usuario: {
        Row: {
          created_at: string | null
          favoritos_exercicios: string[]
          id: string
          localizacao_permitida: boolean | null
          lucas_estilo: string
          lucas_profundidade: string
          lucas_sugestoes: string
          lucas_tom: string
          notificacoes_ativas: boolean
          sons_favoritos: string[]
          tema: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          favoritos_exercicios?: string[]
          id?: string
          localizacao_permitida?: boolean | null
          lucas_estilo?: string
          lucas_profundidade?: string
          lucas_sugestoes?: string
          lucas_tom?: string
          notificacoes_ativas?: boolean
          sons_favoritos?: string[]
          tema?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          favoritos_exercicios?: string[]
          id?: string
          localizacao_permitida?: boolean | null
          lucas_estilo?: string
          lucas_profundidade?: string
          lucas_sugestoes?: string
          lucas_tom?: string
          notificacoes_ativas?: boolean
          sons_favoritos?: string[]
          tema?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      presenca_online: {
        Row: {
          online: boolean | null
          ultimo_acesso: string
          user_id: string
        }
        Insert: {
          online?: boolean | null
          ultimo_acesso?: string
          user_id: string
        }
        Update: {
          online?: boolean | null
          ultimo_acesso?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          reminder_hour: number
          timezone_offset_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          reminder_hour?: number
          timezone_offset_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          reminder_hour?: number
          timezone_offset_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streak_restauracoes: {
        Row: {
          created_at: string
          data_restaurada: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_restaurada: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_restaurada?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      treino_exercicios: {
        Row: {
          created_at: string | null
          descanso_seg: number | null
          id: string
          nome: string
          observacao: string | null
          ordem: number | null
          repeticoes: string
          series: number
          treino_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descanso_seg?: number | null
          id?: string
          nome: string
          observacao?: string | null
          ordem?: number | null
          repeticoes?: string
          series?: number
          treino_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          descanso_seg?: number | null
          id?: string
          nome?: string
          observacao?: string | null
          ordem?: number | null
          repeticoes?: string
          series?: number
          treino_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treino_exercicios_treino_id_fkey"
            columns: ["treino_id"]
            isOneToOne: false
            referencedRelation: "treinos"
            referencedColumns: ["id"]
          },
        ]
      }
      treino_perfil: {
        Row: {
          cardio: string
          created_at: string | null
          descanso_pref: number | null
          dias_semana: number
          grupo_foco: string
          id: string
          limitacoes: string | null
          local_treino: string
          nivel: string
          objetivo: string
          tempo_treino: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cardio: string
          created_at?: string | null
          descanso_pref?: number | null
          dias_semana: number
          grupo_foco: string
          id?: string
          limitacoes?: string | null
          local_treino: string
          nivel: string
          objetivo: string
          tempo_treino: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cardio?: string
          created_at?: string | null
          descanso_pref?: number | null
          dias_semana?: number
          grupo_foco?: string
          id?: string
          limitacoes?: string | null
          local_treino?: string
          nivel?: string
          objetivo?: string
          tempo_treino?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      treino_registro: {
        Row: {
          created_at: string | null
          data: string
          exercicio_id: string | null
          exercicio_nome: string
          id: string
          observacao: string | null
          peso_kg: number
          repeticoes: number
          series: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: string
          exercicio_id?: string | null
          exercicio_nome: string
          id?: string
          observacao?: string | null
          peso_kg?: number
          repeticoes?: number
          series?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: string
          exercicio_id?: string | null
          exercicio_nome?: string
          id?: string
          observacao?: string | null
          peso_kg?: number
          repeticoes?: number
          series?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treino_registro_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "treino_exercicios"
            referencedColumns: ["id"]
          },
        ]
      }
      treinos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          dia_semana: number | null
          divisao: string | null
          gerado_por_ia: boolean | null
          id: string
          nome: string
          ordem: number | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          dia_semana?: number | null
          divisao?: string | null
          gerado_por_ia?: boolean | null
          id?: string
          nome: string
          ordem?: number | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          dia_semana?: number | null
          divisao?: string | null
          gerado_por_ia?: boolean | null
          id?: string
          nome?: string
          ordem?: number | null
          user_id?: string
        }
        Relationships: []
      }
      uso_ia: {
        Row: {
          contagem: number
          janela_inicio: string
          recurso: string
          user_id: string
        }
        Insert: {
          contagem?: number
          janela_inicio?: string
          recurso: string
          user_id: string
        }
        Update: {
          contagem?: number
          janela_inicio?: string
          recurso?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anexar_prova_desafio: {
        Args: { p_desafio: string; p_path: string }
        Returns: undefined
      }
      buscar_perfis: {
        Args: { p_termo: string }
        Returns: {
          avatar_url: string
          nickname: string
          nome: string
          user_id: string
        }[]
      }
      confirmar_desafio: { Args: { p_desafio: string }; Returns: string }
      consumir_cota_ia: {
        Args: {
          p_janela_segundos: number
          p_limite: number
          p_recurso: string
          p_user: string
        }
        Returns: boolean
      }
      definir_habitos_do_dia: {
        Args: { p_data: string; p_habitos: string[] }
        Returns: {
          concluido: boolean
          habito_id: string
        }[]
      }
      listar_amigos: {
        Args: never
        Returns: {
          avatar_url: string
          nickname: string
          nome: string
          online: boolean
          user_id: string
        }[]
      }
      listar_desafios: {
        Args: never
        Returns: {
          confirmacao_criador: boolean
          confirmacao_desafiado: boolean
          created_at: string
          criador_id: string
          criador_nome: string
          desafiado_id: string
          desafiado_nome: string
          descricao: string
          flag_suspeito: boolean
          id: string
          meta: number
          motivo_flag: string
          progresso_criador: number
          progresso_desafiado: number
          prova_criador_path: string
          prova_desafiado_path: string
          status: string
          titulo: string
        }[]
      }
      listar_pedidos_amizade: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          id: string
          nickname: string
          nome: string
          user_id: string
        }[]
      }
      minha_sequencia: { Args: { p_hoje: string }; Returns: number }
      perfil_publico: {
        Args: { p_como_amigo?: boolean; p_user_id: string }
        Returns: Json
      }
      registrar_progresso_desafio: {
        Args: { p_desafio: string }
        Returns: undefined
      }
      resumo_habitos: {
        Args: { p_fim: string; p_inicio: string }
        Returns: {
          concluidos: number
          data: string
          restaurado: boolean
          total: number
        }[]
      }
      substituir_habitos_ia: {
        Args: { p_habitos: Json; p_hoje: string }
        Returns: number
      }
      substituir_treinos_ia: { Args: { p_treinos: Json }; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

