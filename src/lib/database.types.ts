export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          full_name: string | null
          phone: string | null
          role: 'USER' | 'ADMIN'
          created_at: string
        }
        Insert: {
          user_id: string
          full_name?: string | null
          phone?: string | null
          role?: 'USER' | 'ADMIN'
          created_at?: string
        }
        Update: {
          user_id?: string
          full_name?: string | null
          phone?: string | null
          role?: 'USER' | 'ADMIN'
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          price_paise: number
          status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
          visibility: 'PUBLIC' | 'HIDDEN'
          category_id: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          price_paise: number
          status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
          visibility?: 'PUBLIC' | 'HIDDEN'
          category_id?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          price_paise?: number
          status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
          visibility?: 'PUBLIC' | 'HIDDEN'
          category_id?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory: {
        Row: {
          product_id: string
          stock: number
          updated_at: string
        }
        Insert: {
          product_id: string
          stock: number
          updated_at?: string
        }
        Update: {
          product_id?: string
          stock?: number
          updated_at?: string
        }
      }
      cart_items: {
        Row: {
          id: string
          user_id: string
          product_id: string
          qty: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          qty: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          qty?: number
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          status: 'CREATED' | 'PAID' | 'FAILED' | 'CANCELLED' | 'FULFILLED'
          total_paise: number
          payment_method: 'COD' | 'MOCK' | 'RAZORPAY_PLACEHOLDER'
          payment_status: 'NOT_INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: 'CREATED' | 'PAID' | 'FAILED' | 'CANCELLED' | 'FULFILLED'
          total_paise: number
          payment_method?: 'COD' | 'MOCK' | 'RAZORPAY_PLACEHOLDER'
          payment_status?: 'NOT_INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: 'CREATED' | 'PAID' | 'FAILED' | 'CANCELLED' | 'FULFILLED'
          total_paise?: number
          payment_method?: 'COD' | 'MOCK' | 'RAZORPAY_PLACEHOLDER'
          payment_status?: 'NOT_INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED'
          created_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          title_snapshot: string
          price_paise_snapshot: number
          qty: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          title_snapshot: string
          price_paise_snapshot: number
          qty: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          title_snapshot?: string
          price_paise_snapshot?: number
          qty?: number
        }
      }
    }
  }
}

// Convenience row type aliases (used in admin pages)
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row'] & {
  categories?: Category | null
  inventory?: { stock: number }[] | null
}
export type Inventory = Database['public']['Tables']['inventory']['Row']
export type CartItem = Database['public']['Tables']['cart_items']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']

// Joined types for UI use
export type ProductWithCategory = Database['public']['Tables']['products']['Row'] & {
  categories: Database['public']['Tables']['categories']['Row'] | null
  inventory: { stock: number } | null
}

export type CartItemWithProduct = Database['public']['Tables']['cart_items']['Row'] & {
  products: ProductWithCategory | null
}

export type OrderWithItems = Database['public']['Tables']['orders']['Row'] & {
  order_items: (Database['public']['Tables']['order_items']['Row'])[]
}
