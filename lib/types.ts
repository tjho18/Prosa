export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      novels: {
        Row: {
          id: string
          author_id: string
          slug: string
          title: string
          tagline: string | null
          description: string | null
          cover_bg: string
          cover_ink: string
          cover_accent: string
          cover_layout: string
          cover_image_url: string | null
          status: 'draft' | 'serial' | 'complete'
          tags: string[]
          total_chapters: number
          published_chapters: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['novels']['Row'], 'id' | 'created_at' | 'updated_at' | 'total_chapters' | 'published_chapters'>
        Update: Partial<Database['public']['Tables']['novels']['Insert']>
      }
      chapters: {
        Row: {
          id: string
          novel_id: string
          number: number
          title: string
          content: string
          word_count: number
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['chapters']['Row'], 'id' | 'created_at' | 'updated_at' | 'word_count'>
        Update: Partial<Database['public']['Tables']['chapters']['Insert']>
      }
      reading_progress: {
        Row: {
          user_id: string
          novel_id: string
          chapter_number: number
          scroll_position: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['reading_progress']['Row'], 'updated_at'>
        Update: Partial<Database['public']['Tables']['reading_progress']['Insert']>
      }
    }
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Novel = Database['public']['Tables']['novels']['Row']
export type Chapter = Database['public']['Tables']['chapters']['Row']
export type ReadingProgress = Database['public']['Tables']['reading_progress']['Row']

// Novel with author joined
export type NovelWithAuthor = Novel & { profiles: Profile }
