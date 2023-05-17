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
          user_id?: string | null
        }
      }
      account_calendars: {
        Row: {
          account_id: number
          calendar_id: number
          created_at: string | null
        }
        Insert: {
          account_id: number
          calendar_id: number
          created_at?: string | null
        }
        Update: {
          account_id?: number
          calendar_id?: number
          created_at?: string | null
        }
      }
      attendee: {
        Row: {
          account_id: number
          event_id: number
          response: Database["public"]["Enums"]["attendance"] | null
        }
        Insert: {
          account_id: number
          event_id: number
          response?: Database["public"]["Enums"]["attendance"] | null
        }
        Update: {
          account_id?: number
          event_id?: number
          response?: Database["public"]["Enums"]["attendance"] | null
        }
      }
      calendar: {
        Row: {
          calendar_id: string
          created_at: string | null
          id: number
          name: string
          organization_id: number | null
          provider: Database["public"]["Enums"]["provider"]
        }
        Insert: {
          calendar_id: string
          created_at?: string | null
          id?: number
          name: string
          organization_id?: number | null
          provider: Database["public"]["Enums"]["provider"]
        }
        Update: {
          calendar_id?: string
          created_at?: string | null
          id?: number
          name?: string
          organization_id?: number | null
          provider?: Database["public"]["Enums"]["provider"]
        }
      }
      calendar_events: {
        Row: {
          calendar_id: number
          event_id: number
          synced_at: string
        }
        Insert: {
          calendar_id: number
          event_id: number
          synced_at?: string
        }
        Update: {
          calendar_id?: number
          event_id?: number
          synced_at?: string
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
          created_at: string | null
          description: string | null
          end_at: string | null
          id: number
          is_offsite: boolean
          is_online: boolean
          is_onsite: boolean
          length: number | null
          recurrence_id: string | null
          start_at: string
          title: string | null
          uid: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: number
          is_offsite?: boolean
          is_online?: boolean
          is_onsite?: boolean
          length?: number | null
          recurrence_id?: string | null
          start_at: string
          title?: string | null
          uid: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: number
          is_offsite?: boolean
          is_online?: boolean
          is_onsite?: boolean
          length?: number | null
          recurrence_id?: string | null
          start_at?: string
          title?: string | null
          uid?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_or_create_organization_id: {
        Args: {
          email: string
        }
        Returns: number
      }
      parse_provider: {
        Args: {
          p_text_value: string
        }
        Returns: Database["public"]["Enums"]["provider"]
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

