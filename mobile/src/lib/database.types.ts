// Generated via `supabase gen types typescript --linked` against the
// Menuko project — regenerate the same way after any schema migration
// instead of hand-editing the Database type below.
//
// COPY, not a symlink: this file is duplicated from ../../../src/lib/database.types.ts
// (the web app). After running `supabase gen types` there, copy the result
// here too — see mobile/README.md "공용 코드 동기화".
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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          email: string
          id: string
          restaurant_id: string
          role: Database["public"]["Enums"]["account_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          restaurant_id: string
          role: Database["public"]["Enums"]["account_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["account_role"]
        }
        Relationships: [
          {
            foreignKeyName: "accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          created_at: string
          headline: string
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          restaurant_id: string
          subcopy: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          headline: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          restaurant_id: string
          subcopy?: string | null
          template_id?: string
        }
        Update: {
          created_at?: string
          headline?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          restaurant_id?: string
          subcopy?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_push_tokens: {
        Row: {
          account_id: string
          created_at: string
          expo_push_token: string
          id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          expo_push_token: string
          id?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          expo_push_token?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_push_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          restaurant_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_available: boolean
          name: string
          photo_url: string | null
          price: number
          restaurant_id: string
          sort_order: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          name: string
          photo_url?: string | null
          price: number
          restaurant_id: string
          sort_order?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          name?: string
          photo_url?: string | null
          price?: number
          restaurant_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string | null
          order_id: string
          quantity: number
          restaurant_id: string
          unit_price_snapshot: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          order_id: string
          quantity: number
          restaurant_id: string
          unit_price_snapshot: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          order_id?: string
          quantity?: number
          restaurant_id?: string
          unit_price_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_token: string
          channel: Database["public"]["Enums"]["order_channel"]
          created_at: string
          id: string
          note: string | null
          restaurant_id: string
          status: Database["public"]["Enums"]["order_status"]
          table_id: string
        }
        Insert: {
          access_token?: string
          channel?: Database["public"]["Enums"]["order_channel"]
          created_at?: string
          id?: string
          note?: string | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["order_status"]
          table_id: string
        }
        Update: {
          access_token?: string
          channel?: Database["public"]["Enums"]["order_channel"]
          created_at?: string
          id?: string
          note?: string | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          business_type: Database["public"]["Enums"]["business_type"]
          created_at: string
          cuisine_tags: string[]
          id: string
          menu_template: string
          name: string
          payment_link: string | null
          payment_qr_url: string | null
          plan: Database["public"]["Enums"]["restaurant_plan"]
        }
        Insert: {
          address?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          cuisine_tags?: string[]
          id?: string
          menu_template?: string
          name: string
          payment_link?: string | null
          payment_qr_url?: string | null
          plan?: Database["public"]["Enums"]["restaurant_plan"]
        }
        Update: {
          address?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          created_at?: string
          cuisine_tags?: string[]
          id?: string
          menu_template?: string
          name?: string
          payment_link?: string | null
          payment_qr_url?: string | null
          plan?: Database["public"]["Enums"]["restaurant_plan"]
        }
        Relationships: []
      }
      tables: {
        Row: {
          capacity: number
          created_at: string
          first_order_at: string | null
          id: string
          is_virtual: boolean
          label: string
          occupied_since: string | null
          occupied_source: string | null
          qr_token: string
          restaurant_id: string
          stall_alerted: boolean
        }
        Insert: {
          capacity?: number
          created_at?: string
          first_order_at?: string | null
          id?: string
          is_virtual?: boolean
          label: string
          occupied_since?: string | null
          occupied_source?: string | null
          qr_token?: string
          restaurant_id: string
          stall_alerted?: boolean
        }
        Update: {
          capacity?: number
          created_at?: string
          first_order_at?: string | null
          id?: string
          is_virtual?: boolean
          label?: string
          occupied_since?: string | null
          occupied_source?: string | null
          qr_token?: string
          restaurant_id?: string
          stall_alerted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_table_stalls: { Args: never; Returns: undefined }
      create_manual_order: {
        Args: {
          p_channel: Database["public"]["Enums"]["order_channel"]
          p_items: Json
          p_note?: string
        }
        Returns: {
          access_token: string
          order_id: string
        }[]
      }
      create_order: {
        Args: { p_items: Json; p_qr_token: string }
        Returns: {
          access_token: string
          order_id: string
        }[]
      }
      free_table: { Args: { p_table_id: string }; Returns: undefined }
      get_order_for_customer: {
        Args: { p_access_token: string; p_order_id: string }
        Returns: {
          created_at: string
          id: string
          item_id: string
          item_name: string
          menu_item_id: string
          quantity: number
          status: Database["public"]["Enums"]["order_status"]
          unit_price_snapshot: number
        }[]
      }
      mark_table_occupied: { Args: { p_table_id: string }; Returns: undefined }
      mark_table_scanned: { Args: { p_qr_token: string }; Returns: undefined }
      my_restaurant_id: { Args: never; Returns: string }
      my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["account_role"]
      }
    }
    Enums: {
      account_role: "owner" | "kitchen" | "cashier"
      business_type: "restaurant" | "cafe"
      order_channel: "dine_in" | "manual_delivery_entry" | "manual_pickup_entry"
      order_status: "open" | "sent_to_kitchen" | "preparing" | "served" | "paid"
      restaurant_plan: "free" | "premium"
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_role: ["owner", "kitchen", "cashier"],
      business_type: ["restaurant", "cafe"],
      order_channel: [
        "dine_in",
        "manual_delivery_entry",
        "manual_pickup_entry",
      ],
      order_status: ["open", "sent_to_kitchen", "preparing", "served", "paid"],
      restaurant_plan: ["free", "premium"],
    },
  },
} as const

// Convenience aliases used throughout the app instead of the verbose
// Database["public"]["Enums"][...] path.
export type AccountRole = Database["public"]["Enums"]["account_role"]
export type RestaurantPlan = Database["public"]["Enums"]["restaurant_plan"]
export type OrderStatus = Database["public"]["Enums"]["order_status"]
export type OrderChannel = Database["public"]["Enums"]["order_channel"]
export type BusinessType = Database["public"]["Enums"]["business_type"]
