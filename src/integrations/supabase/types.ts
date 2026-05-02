export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      amizades: {
        Row: {
          amigo_id: string
          created_at: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          amigo_id: string
          created_at?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          amigo_id?: string
          created_at?: string | null
          id?: string
          status?: string
          user_id?: string
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
          energia: string
          humor: string
          id: string
          observacao: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: string
          energia: string
          humor: string
          id?: string
          observacao?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: string
          energia?: string
          humor?: string
          id?: string
          observacao?: string | null
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
        Relationships: []
      }
      desafios: {
        Row: {
          confirmacao_criador: boolean | null
          confirmacao_desafiado: boolean | null
          created_at: string | null
          criador_id: string
          data_fim: string | null
          desafiado_id: string
          descricao: string | null
          flag_suspeito: boolean | null
          id: string
          meta: number | null
          motivo_flag: string | null
          progresso_criador: number | null
          progresso_desafiado: number | null
          prova_criador_url: string | null
          prova_desafiado_url: string | null
          status: string | null
          titulo: string
        }
        Insert: {
          confirmacao_criador?: boolean | null
          confirmacao_desafiado?: boolean | null
          created_at?: string | null
          criador_id: string
          data_fim?: string | null
          desafiado_id: string
          descricao?: string | null
          flag_suspeito?: boolean | null
          id?: string
          meta?: number | null
          motivo_flag?: string | null
          progresso_criador?: number | null
          progresso_desafiado?: number | null
          prova_criador_url?: string | null
          prova_desafiado_url?: string | null
          status?: string | null
          titulo: string
        }
        Update: {
          confirmacao_criador?: boolean | null
          confirmacao_desafiado?: boolean | null
          created_at?: string | null
          criador_id?: string
          data_fim?: string | null
          desafiado_id?: string
          descricao?: string | null
          flag_suspeito?: boolean | null
          id?: string
          meta?: number | null
          motivo_flag?: string | null
          progresso_criador?: number | null
          progresso_desafiado?: number | null
          prova_criador_url?: string | null
          prova_desafiado_url?: string | null
          status?: string | null
          titulo?: string
        }
        Relationships: []
      }
      habito_registro: {
        Row: {
          concluido: boolean | null
          created_at: string | null
          data: string
          habito_id: string
          id: string
          user_id: string
        }
        Insert: {
          concluido?: boolean | null
          created_at?: string | null
          data?: string
          habito_id: string
          id?: string
          user_id: string
        }
        Update: {
          concluido?: boolean | null
          created_at?: string | null
          data?: string
          habito_id?: string
          id?: string
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
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          gerado_por_ia: boolean | null
          icone: string | null
          id: string
          nome_habito: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          gerado_por_ia?: boolean | null
          icone?: string | null
          id?: string
          nome_habito: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          gerado_por_ia?: boolean | null
          icone?: string | null
          id?: string
          nome_habito?: string
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
          created_at: string | null
          humor_geral: string | null
          id: string
          idade: number | null
          nickname: string | null
          nivel_atividade: string | null
          nivel_estresse: string | null
          nome: string
          objetivo: string | null
          onboarding_completo: boolean | null
          peso: number | null
          qualidade_sono: string | null
          rotina: string | null
          sexo: string | null
          sobre_voce: string | null
          tempo_livre: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          altura?: number | null
          avatar_url?: string | null
          created_at?: string | null
          humor_geral?: string | null
          id?: string
          idade?: number | null
          nickname?: string | null
          nivel_atividade?: string | null
          nivel_estresse?: string | null
          nome?: string
          objetivo?: string | null
          onboarding_completo?: boolean | null
          peso?: number | null
          qualidade_sono?: string | null
          rotina?: string | null
          sexo?: string | null
          sobre_voce?: string | null
          tempo_livre?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          altura?: number | null
          avatar_url?: string | null
          created_at?: string | null
          humor_geral?: string | null
          id?: string
          idade?: number | null
          nickname?: string | null
          nivel_atividade?: string | null
          nivel_estresse?: string | null
          nome?: string
          objetivo?: string | null
          onboarding_completo?: boolean | null
          peso?: number | null
          qualidade_sono?: string | null
          rotina?: string | null
          sexo?: string | null
          sobre_voce?: string | null
          tempo_livre?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      preferencias_usuario: {
        Row: {
          created_at: string | null
          id: string
          localizacao_permitida: boolean | null
          lucas_estilo: string | null
          lucas_profundidade: string | null
          lucas_sugestoes: string | null
          lucas_tom: string | null
          notificacoes_ativas: boolean | null
          sons_favoritos: string[] | null
          tema: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          localizacao_permitida?: boolean | null
          lucas_estilo?: string | null
          lucas_profundidade?: string | null
          lucas_sugestoes?: string | null
          lucas_tom?: string | null
          notificacoes_ativas?: boolean | null
          sons_favoritos?: string[] | null
          tema?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          localizacao_permitida?: boolean | null
          lucas_estilo?: string | null
          lucas_profundidade?: string | null
          lucas_sugestoes?: string | null
          lucas_tom?: string | null
          notificacoes_ativas?: boolean | null
          sons_favoritos?: string[] | null
          tema?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      presenca_online: {
        Row: {
          online: boolean | null
          ultimo_acesso: string | null
          user_id: string
        }
        Insert: {
          online?: boolean | null
          ultimo_acesso?: string | null
          user_id: string
        }
        Update: {
          online?: boolean | null
          ultimo_acesso?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
