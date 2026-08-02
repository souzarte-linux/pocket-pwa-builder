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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      billing_cycles: {
        Row: {
          created_at: string
          expected_payment_date: string
          id: string
          period_end: string
          period_start: string
          platform_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expected_payment_date: string
          id?: string
          period_end: string
          period_start: string
          platform_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expected_payment_date?: string
          id?: string
          period_end?: string
          period_start?: string
          platform_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_cycles_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      card_operators: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_totals: {
        Row: {
          amount: number
          billing_cycle_id: string | null
          created_at: string
          distance_km: number | null
          id: string
          notes: string | null
          occurred_at: string
          platform_id: string | null
          product_type: Database["public"]["Enums"]["product_type"] | null
          subtract_routes: boolean | null
          user_id: string
        }
        Insert: {
          amount: number
          billing_cycle_id?: string | null
          created_at?: string
          distance_km?: number | null
          id?: string
          notes?: string | null
          occurred_at?: string
          platform_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          subtract_routes?: boolean | null
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle_id?: string | null
          created_at?: string
          distance_km?: number | null
          id?: string
          notes?: string | null
          occurred_at?: string
          platform_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          subtract_routes?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_totals_billing_cycle_id_fkey"
            columns: ["billing_cycle_id"]
            isOneToOne: false
            referencedRelation: "billing_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_totals_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }

      expenses: {
        Row: {
          amount: number
          card_brand: string | null
          card_operator: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string | null
          fuel_type: string | null
          id: string
          installment_group_id: string | null
          installment_number: number | null
          installment_total: number | null
          invoice_number: string | null
          is_full_tank: boolean
          liters: number | null
          occurred_at: string
          odometer_km: number | null
          part_brand: string | null
          part_life_km: number | null
          part_model: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          price_per_liter: number | null
          receipt_number: string | null
          title: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount: number
          card_brand?: string | null
          card_operator?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          fuel_type?: string | null
          id?: string
          installment_group_id?: string | null
          installment_number?: number | null
          installment_total?: number | null
          invoice_number?: string | null
          is_full_tank?: boolean
          liters?: number | null
          occurred_at?: string
          odometer_km?: number | null
          part_brand?: string | null
          part_life_km?: number | null
          part_model?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          price_per_liter?: number | null
          receipt_number?: string | null
          title: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          card_brand?: string | null
          card_operator?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          fuel_type?: string | null
          id?: string
          installment_group_id?: string | null
          installment_number?: number | null
          installment_total?: number | null
          invoice_number?: string | null
          is_full_tank?: boolean
          liters?: number | null
          occurred_at?: string
          odometer_km?: number | null
          part_brand?: string | null
          part_life_km?: number | null
          part_model?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          price_per_liter?: number | null
          receipt_number?: string | null
          title?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: []
      }
      part_maintenance: {
        Row: {
          created_at: string
          id: string
          last_change_at: string
          last_change_km: number
          life_km: number
          part_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_change_at?: string
          last_change_km: number
          life_km: number
          part_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_change_at?: string
          last_change_km?: number
          life_km?: number
          part_name?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_adjustments: {
        Row: {
          amount: number
          billing_cycle_id: string | null
          created_at: string
          description: string | null
          id: string
          occurred_at: string
          platform_id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_cycle_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          occurred_at: string
          platform_id: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          occurred_at?: string
          platform_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_adjustments_billing_cycle_id_fkey"
            columns: ["billing_cycle_id"]
            isOneToOne: false
            referencedRelation: "billing_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      gas_stations: {
        Row: {
          address: string | null
          brand: string
          created_at: string
          fuel_types: Json | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          address?: string | null
          brand: string
          created_at?: string
          fuel_types?: Json | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          address?: string | null
          brand?: string
          created_at?: string
          fuel_types?: Json | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      oil_changes: {
        Row: {
          changed_at: string
          created_at: string
          id: string
          km_at_change: number
          notes: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          created_at?: string
          id?: string
          km_at_change?: number
          notes?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          created_at?: string
          id?: string
          km_at_change?: number
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }

      platforms: {
        Row: {
          active: boolean
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          created_at: string
          cycle: Database["public"]["Enums"]["payment_cycle"]
          id: string
          name: string
          payment_day: string | null
          payment_model: string
          pix_bank: string | null
          pix_key: string | null
          pix_key_type: string | null
          rules: Json
          segment: string
          user_id: string
        }
        Insert: {
          active?: boolean
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          created_at?: string
          cycle?: Database["public"]["Enums"]["payment_cycle"]
          id?: string
          name: string
          payment_day?: string | null
          payment_model?: string
          pix_bank?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          rules?: Json
          segment?: string
          user_id: string
        }
        Update: {
          active?: boolean
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          created_at?: string
          cycle?: Database["public"]["Enums"]["payment_cycle"]
          id?: string
          name?: string
          payment_day?: string | null
          payment_model?: string
          pix_bank?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          rules?: Json
          segment?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          avg_consumption_kml: number | null
          created_at: string
          daily_goal: number | null
          email: string | null
          full_name: string | null
          gender: string | null
          has_bag: boolean | null
          id: string
          last_oil_change_at: string | null
          monthly_goal: number | null
          oil_change_km: number | null
          phone: string | null
          plate: string | null
          social_handle: string | null
          tank_size_l: number | null
          tire_size_front: string | null
          tire_size_rear: string | null
          updated_at: string
          vehicle: Database["public"]["Enums"]["vehicle_type"] | null
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_year: number | null
          weekly_goal: number | null
        }
        Insert: {
          avatar_url?: string | null
          avg_consumption_kml?: number | null
          created_at?: string
          daily_goal?: number | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          has_bag?: boolean | null
          id: string
          last_oil_change_at?: string | null
          monthly_goal?: number | null
          oil_change_km?: number | null
          phone?: string | null
          plate?: string | null
          social_handle?: string | null
          tank_size_l?: number | null
          tire_size_front?: string | null
          tire_size_rear?: string | null
          updated_at?: string
          vehicle?: Database["public"]["Enums"]["vehicle_type"] | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          weekly_goal?: number | null
        }
        Update: {
          avatar_url?: string | null
          avg_consumption_kml?: number | null
          created_at?: string
          daily_goal?: number | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          has_bag?: boolean | null
          id?: string
          last_oil_change_at?: string | null
          monthly_goal?: number | null
          oil_change_km?: number | null
          phone?: string | null
          plate?: string | null
          social_handle?: string | null
          tank_size_l?: number | null
          tire_size_front?: string | null
          tire_size_rear?: string | null
          updated_at?: string
          vehicle?: Database["public"]["Enums"]["vehicle_type"] | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          weekly_goal?: number | null
        }
        Relationships: []
      }
      routes: {
        Row: {
          amount: number
          billing_cycle_id: string | null
          break_minutes: number
          created_at: string
          destination: string | null
          distance_km: number
          end_km: number
          ended_at: string | null
          id: string
          large_packages_count: number | null
          large_packages_prices: Json | null
          notes: string | null
          occurred_at: string
          origin: string | null
          package_count: number
          package_unit_price: number
          platform_id: string | null
          product_type: Database["public"]["Enums"]["product_type"]
          small_packages_count: number | null
          start_km: number
          started_at: string | null
          tip: number
          user_id: string
        }
        Insert: {
          amount?: number
          billing_cycle_id?: string | null
          break_minutes?: number
          created_at?: string
          destination?: string | null
          distance_km?: number
          end_km?: number
          ended_at?: string | null
          id?: string
          large_packages_count?: number | null
          large_packages_prices?: Json | null
          notes?: string | null
          occurred_at?: string
          origin?: string | null
          package_count?: number
          package_unit_price?: number
          platform_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          small_packages_count?: number | null
          start_km?: number
          started_at?: string | null
          tip?: number
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle_id?: string | null
          break_minutes?: number
          created_at?: string
          destination?: string | null
          distance_km?: number
          end_km?: number
          ended_at?: string | null
          id?: string
          large_packages_count?: number | null
          large_packages_prices?: Json | null
          notes?: string | null
          occurred_at?: string
          origin?: string | null
          package_count?: number
          package_unit_price?: number
          platform_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          small_packages_count?: number | null
          start_km?: number
          started_at?: string | null
          tip?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_billing_cycle_id_fkey"
            columns: ["billing_cycle_id"]
            isOneToOne: false
            referencedRelation: "billing_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      work_sessions: {
        Row: {
          break_minutes: number
          created_at: string
          end_km: number
          ended_at: string | null
          id: string
          notes: string | null
          platform_id: string | null
          product_type: Database["public"]["Enums"]["product_type"] | null
          start_km: number
          started_at: string
          user_id: string
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          end_km?: number
          ended_at?: string | null
          id?: string
          notes?: string | null
          platform_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          start_km?: number
          started_at?: string
          user_id: string
        }
        Update: {
          break_minutes?: number
          created_at?: string
          end_km?: number
          ended_at?: string | null
          id?: string
          notes?: string | null
          platform_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          start_km?: number
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_sessions_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      expense_category: "combustivel" | "manutencao" | "alimentacao"
      payment_cycle: "semanal" | "quinzenal" | "mensal" | "misto"
      payment_method: "dinheiro" | "pix" | "cartao" | "carteira"
      product_type: "alimento" | "pacote" | "documento" | "outro"
      vehicle_type: "moto" | "carro" | "bike" | "patinete"
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
    Enums: {
      expense_category: ["combustivel", "manutencao", "alimentacao"],
      payment_cycle: ["semanal", "quinzenal", "mensal", "misto"],
      payment_method: ["dinheiro", "pix", "cartao", "carteira"],
      product_type: ["alimento", "pacote", "documento", "outro"],
      vehicle_type: ["moto", "carro", "bike", "patinete"],
    },
  },
} as const
