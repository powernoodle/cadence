export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      account: {
        Row: {
          created_at: string | null
          credentials: Json | null
          email: string
          id: number
          name: string | null
          organization_id: number | null
          provider: Database["public"]["Enums"]["provider"] | null
          sync_progress: number | null
          synced_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          credentials?: Json | null
          email: string
          id?: number
          name?: string | null
          organization_id?: number | null
          provider?: Database["public"]["Enums"]["provider"] | null
          sync_progress?: number | null
          synced_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          credentials?: Json | null
          email?: string
          id?: number
          name?: string | null
          organization_id?: number | null
          provider?: Database["public"]["Enums"]["provider"] | null
          sync_progress?: number | null
          synced_at?: string | null
          user_id?: string | null
        }
      }
      attendee: {
        Row: {
          account_id: number
          event_id: number
          is_organizer: boolean
          response: Database["public"]["Enums"]["attendance"] | null
        }
        Insert: {
          account_id: number
          event_id: number
          is_organizer?: boolean
          response?: Database["public"]["Enums"]["attendance"] | null
        }
        Update: {
          account_id?: number
          event_id?: number
          is_organizer?: boolean
          response?: Database["public"]["Enums"]["attendance"] | null
        }
      }
      domain: {
        Row: {
          created_at: string | null
          domain: string
          id: number
          organization_id: number | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: number
          organization_id?: number | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: number
          organization_id?: number | null
        }
      }
      event: {
        Row: {
          account_id: number
          at: unknown | null
          cal_id: string
          created_at: string | null
          id: number
          is_meeting: boolean
          is_offsite: boolean
          is_online: boolean
          is_onsite: boolean
          series: string | null
          title: string | null
        }
        Insert: {
          account_id: number
          at?: unknown | null
          cal_id: string
          created_at?: string | null
          id?: number
          is_meeting?: boolean
          is_offsite?: boolean
          is_online?: boolean
          is_onsite?: boolean
          series?: string | null
          title?: string | null
        }
        Update: {
          account_id?: number
          at?: unknown | null
          cal_id?: string
          created_at?: string | null
          id?: number
          is_meeting?: boolean
          is_offsite?: boolean
          is_online?: boolean
          is_onsite?: boolean
          series?: string | null
          title?: string | null
        }
      }
      organization: {
        Row: {
          created_at: string | null
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string | null
        }
      }
      raw_event: {
        Row: {
          account_id: number | null
          created_at: string | null
          event_id: number | null
          id: number
          raw_event: Json
        }
        Insert: {
          account_id?: number | null
          created_at?: string | null
          event_id?: number | null
          id?: number
          raw_event: Json
        }
        Update: {
          account_id?: number | null
          created_at?: string | null
          event_id?: number | null
          id?: number
          raw_event?: Json
        }
      }
    }
    Views: {
      event_stats: {
        Row: {
          account_id: number | null
          at: unknown | null
          attendee_count: number | null
          attendees: string | null
          cal_id: string | null
          created_at: string | null
          id: number | null
          invitee_count: number | null
          is_meeting: boolean | null
          is_offsite: boolean | null
          is_online: boolean | null
          is_onsite: boolean | null
          length: number | null
          series: string | null
          title: string | null
        }
      }
    }
    Functions: {
      current_account_id: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      event_by_length: {
        Args: {
          event_account_id: number
          during: unknown
        }
        Returns: {
          account_id: number
          length: number
          meeting_count: number
          length_sum: number
          cost: number
        }[]
      }
      event_by_organizer: {
        Args: {
          event_account_id: number
          during: unknown
        }
        Returns: {
          account_id: number
          id: number
          name: string
          email: string
          meeting_count: number
          length_sum: number
          cost: number
        }[]
      }
      event_count_by_account: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_id: number
          event_count: number
        }[]
      }
      event_length: {
        Args: {
          at: unknown
          during?: unknown
        }
        Returns: number
      }
      event_series: {
        Args: {
          event_account_id: number
          during: unknown
        }
        Returns: {
          account_id: number
          series: string
          title: string
          is_meeting: boolean
          is_online: boolean
          is_onsite: boolean
          is_offsite: boolean
          meeting_count: number
          length_sum: number
          cost: number
          attendee_count: number
          length: number
          invitee_count: number
        }[]
      }
      event_totals: {
        Args: {
          event_account_id: number
          during: unknown
        }
        Returns: {
          meeting_count: number
          length_sum: number
          cost: number
        }[]
      }
      get_accounts_for_user: {
        Args: Record<PropertyKey, never>
        Returns: number[]
      }
      get_or_create_organization_id: {
        Args: {
          email: string
        }
        Returns: number
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      link_series: {
        Args: {
          account_id: number
        }
        Returns: undefined
      }
      meeting_cost: {
        Args: {
          attendee_occurrences: number
          attendee_minutes: number
        }
        Returns: number
      }
      parse_provider: {
        Args: {
          p_text_value: string
        }
        Returns: Database["public"]["Enums"]["provider"]
      }
      update_credentials: {
        Args: {
          account_id: number
          new_credentials: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      attendance: "accepted" | "declined" | "tentative"
      provider: "google" | "azure"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          path_tokens: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: {
          bucketid: string
          name: string
          owner: string
          metadata: Json
        }
        Returns: undefined
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

